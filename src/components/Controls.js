import React, { useState, useRef, useEffect } from "react";
import Paper from '@material-ui/core/Paper'
import Button from '@material-ui/core/Button'
import Tooltip from '@material-ui/core/Tooltip';
import CloudUploadIcon from '@material-ui/icons/Publish';
import CloudDownloadIcon from '@material-ui/icons/GetApp';
import InfoIcon from '@material-ui/icons/Info'
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import CircularProgress from '@material-ui/core/CircularProgress';
import Typography from '@material-ui/core/Typography'
import { Midi } from '@tonejs/midi'
import * as Constants from '../constants'
import Slider from '@material-ui/core/Slider';
import * as Utils from '../utils'
import * as tf from '@tensorflow/tfjs';
import cloneDeep from "lodash.clonedeep";

const DEFAULT_FILE = process.env.PUBLIC_URL + '/example_fc_62_Db.mid'

// disable download button if bars changes
// some kind of visual, showing distribution of velocities?
// add in loading screen: https://material-ui.com/components/backdrop/

function modelInputsFromNotes(notes) {
  // tensorflowjs docs SAYS that a dictionary of named inputs can be passed in... but problems include:
  // -- ordinary dictionary structure doesn't work
  // -- [{input1: data}, {input2: data}] is recognized as tensors, but doesn't seem to work later on
  const inputShape = [1, notes.length, 1]
  let modelInputs = {
    'TBn_in': tf.reshape(tf.oneHot(notes.map(note => { // note starts (beats), BEATS bit vectors
      return Math.floor(note.subbeat % (Constants.SUBBEATS * 4) / Constants.SUBBEATS)
    }), Constants.BEATS), [1, notes.length, Constants.SUBBEATS]),
    'TSBn_in': tf.reshape(tf.oneHot(notes.map(note => {  // note starts (sub-beats), SUBBEATS bit vectors
      return note.subbeat % Constants.SUBBEATS
    }), Constants.SUBBEATS), [1, notes.length, Constants.SUBBEATS]),
    'PSn_in': tf.tensor(notes.map(note => (note.midi - Constants.MIDI_A0) / 88), inputShape), // pitch cont., scalar
    'PCn_in': tf.reshape(tf.oneHot(notes.map(note => (note.midi - Constants.MIDI_A0) % 12), 12), [1, notes.length, 12]) // pitch class., 12 bit vectors
  };
  return modelInputs;
}

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


export default function Controls(props) {

  // quantize and sort notes
  function preprocessNotes(notes, subBeatLength) {
    // add property with quantized version of note starts
    notes.forEach(note => {
      note.subbeat = Math.round(note.time / subBeatLength);
    });
    // sort notes by note start time
    notes.sort((a, b) => {
      return a.time - b.time
    })
  }

  function preprocessMidi(midi) {
    const bpm = midi.header.tempos[0].bpm;
    // subbeat length in seconds
    const subBeatLength = 60 / bpm / Constants.SUBBEATS;
    // quantize and sort notes
    preprocessNotes(midi.tracks[0].notes, subBeatLength)
    props.setMidiFile(midi)
    props.setNotes(midi.tracks[0].notes)
    // create list of notes in first x bars
    // number of sub beats doesn't account for 0 indexing, so condition is not strictly less than
    props.setFilteredNotes(midi.tracks[0].notes.filter(note => note.subbeat < (props.bars * Constants.BEATS * Constants.SUBBEATS)))
    console.log(midi.tracks[0].notes)
  }

  const [downloadEnabled, setDownloadEnabled] = useState(false)
  const [predicting, setPredicting] = useState(false)
  const [predictProgress, setPredictProgress] = useState(0)

  const prevBars = usePrevious(props.bars)

  if (downloadEnabled & prevBars !== props.bars) {
    setDownloadEnabled(false)
  }


  // get a reference for the input element, so it can be triggered
  const inputRef = useRef()
  function getInput() {
    inputRef.current.click();
  }

  function predictVelocity() {
    setPredicting(true)
    // don't want this in place - want to use setState to replace previous midi
    const modelInputs = modelInputsFromNotes(props.filteredNotes)
    console.log(props.encoderRef.current.summary());
    let modelInputsFormatted = props.encoderRef.current.inputs.map(input => modelInputs[input.originalName]);
    let encoded = props.encoderRef.current.predict(modelInputsFormatted, { batchSize: 1 });
    let vnOut = tf.zeros([1, 1, 1]);
    let predPromises = [];
    for (let i = 0; i < encoded.shape[1]; i++) {
      setPredictProgress(i / encoded.shape[1] * 100)
      let stepInput = { encoded: encoded.slice([0, i, 0], [1, 1, encoded.shape.slice(-1)[0]]), Vn_ar: vnOut };
      console.log(props.decoderRef)
      let stepInputFormatted = props.decoderRef.current.inputs.map(input => stepInput[input.originalName])
      vnOut = props.decoderRef.current.predict(stepInputFormatted, { batchSize: 1 });
      // tensor.array() turns a tensor into an array, returning a promise
      predPromises.push(vnOut.flatten().array())
    }
    // when all the prediction promises are fulfilled
    // - update note velocities of midiFile 
    // - regenerate filteredNotes
    // - set up download
    const newNotes = cloneDeep(props.notes)
    Promise.all(predPromises)
      .then(pred => {
        console.log(pred)
        // notes.forEach((note, i) => note.velocity = remapVelocity(pred[i][0]))
        pred.forEach((p, i) => { newNotes[i].velocity = p[0] })
        // props.setMidiFile(newMidiFile)
        props.setNotes(newNotes)
        const newFilteredNotes = newNotes.filter(note => note.subbeat < (props.bars * Constants.BEATS * Constants.SUBBEATS))
        props.setFilteredNotes(newFilteredNotes)

        props.midiFile.tracks[0].notes = newNotes
        setDownloadEnabled(true)
        setPredicting(false)
      })
  }

  // reader, for reading the received file
  const reader = new FileReader();
  // when file is loaded, process
  reader.addEventListener('load', function () {
    setDownloadEnabled(false)
    // read file into new Midi object
    const midi = new Midi(reader.result);
    if (midi.tracks.length > 1) alert("midi file has more than one track, first will be used");
    preprocessMidi(midi)

    // processMidi(midi);
  }, false)

  function loadDefaultMidi() {
    setDownloadEnabled(false);
    Midi.fromUrl(DEFAULT_FILE).then(midi => preprocessMidi(midi));
  }

  // function for dealing with file selection (attach as onChange event handler)
  function fileReceived(e) {
    // if user clicks 'cancel' on file dialogue, the filelist might be zero
    if (typeof e === 'undefined' || e.target.files.length === 0) return null;
    const selectedFile = e.target.files[0];
    console.log(selectedFile)
    if (Constants.VALID_EXTENSIONS.indexOf(selectedFile.name.split('.').pop()) >= 0) {
      console.log(`Selected file: ${selectedFile.name}`)
      // when the file has been read in, it will trigger the on load reader event
      reader.readAsArrayBuffer(selectedFile);
    } else {
      alert(`The file extension ${selectedFile.name.split('.').pop()} is invalid, must be in ${Constants.VALID_EXTENSIONS}`);
    }
  }

  return (
    <Paper id="controls-container">
      <Typography variant='h4'>Controls</Typography>

      {/* one way of sorting input button, which is more difficult to get working with layout. see https://material-ui.com/guides/composition/  */}
      {/* <input accept="image/*" id="hidden-input" type="file" />
      <label htmlFor='hidden-input' className='control-button'>
        <Button variant="contained" color='primary' endIcon={<CloudUploadIcon />} className='control-button' component="span">
          Load File
        </Button>
      </label> */}
      <input ref={inputRef} id="hidden-input" type="file" onChange={fileReceived} />
      <Button
        variant="contained"
        color='primary'
        endIcon={<CloudUploadIcon />}
        className='control-button'
        onClick={getInput}
      >
        Load File
      </Button>
      <Button
        variant="contained"
        color='secondary'
        disabled={props.encoderRef.current === null || props.decoderRef.current === null || props.midiFile === null}
        endIcon={<MusicNoteIcon />}
        className='control-button'
        onClick={predictVelocity}
      >
        Predict {predicting && <CircularProgress className='predict-progress' size={24} variant='determinate' value={predictProgress} />}
      </Button>

      <Button
        variant="contained"
        color='secondary'
        endIcon={<CloudDownloadIcon />}
        className='control-button'
        disabled={!downloadEnabled}
        onClick={() => {
          const remappedNotes = cloneDeep(props.filteredNotes)
          remappedNotes.forEach(note => note.velocity = Utils.remapVelocity(note.velocity, props.velocityRange[0], props.velocityRange[1]))
          const midiDownload = Object.create(props.midiFile)
          midiDownload.tracks[0].notes = remappedNotes
          const midiBlob = new Blob([midiDownload.toArray()], { type: "octet/stream" })
          var elem = window.document.createElement('a');
          elem.href = window.URL.createObjectURL(midiBlob);
          elem.download = 'prediction.mid';
          // document.body.appendChild(elem);
          elem.click();
        }}
      // or, not using onClick, can do it like this, making the download link elsewhere:
      // href={midiDownloadLink}
      // download="output.midi"
      >
        Download Prediction
      </Button>

      <Typography className='slider-description' variant='button'>
        <Tooltip title='Select the number of bars to use'><InfoIcon fontSize='small' className='info-icon' /></Tooltip>
        <span>
          Bars
        </span>
      </Typography>

      <Slider
        defaultValue={Constants.BARS}
        getAriaValueText={value => `${value} bars`}
        min={1}
        max={12}
        marks={
          [
            { value: 4, label: '4 bars' },
            { value: 8, label: '8 bars' }
          ]}
        valueLabelDisplay={props.midiFile === null ? 'off' : 'auto'}
        // Could do this updating only on mouse up, but then if the mouse is moved off before mouse up...
        // onMouseUp={(e) => {
        //   const newBars = parseInt(e.target.ariaValueNow);
        //   props.setBars(newBars);
        //   props.setFilteredNotes(props.midiFile.tracks[0].notes.filter(note => note.subbeat < (newBars * Constants.BEATS * Constants.SUBBEATS)))
        // }
        onChange={(e, v) => {
          props.setBars(v);
          props.setFilteredNotes(props.midiFile.tracks[0].notes.filter(note => note.subbeat < (v * Constants.BEATS * Constants.SUBBEATS)))
        }
        }
        disabled={props.midiFile === null}
      />
      <Typography className='slider-description' variant='button'>
        <Tooltip title='Select the minimum and maximum MIDI velocity values'><InfoIcon fontSize='small' className='info-icon' /></Tooltip>
        <span>
          Velocity Scaling
        </span>
      </Typography>
      <Slider
        min={0}
        max={127}
        marks={
          // COULD do this to show breaks marks for each note velocity...
          // props.filteredNotes.map(note => ({ value: note.velocity * 127 }))
          // }
          [
            { value: 0, label: '0' },
            { value: 127, label: '127' }
          ]}
        value={props.velocityRange}
        valueLabelDisplay="auto"
        // need to fix this
        // onMouseUp={(e) => {const newValue = parseInt(e.target.ariaValueNow); props.setVelocityRange(newValue); updateMidi(props.midiFile, newValue)}}
        onChange={(e, v) => { props.setVelocityRange(v) }}
        disabled={props.midiFile === null}
      />

      <Button
        variant="contained"
        color='primary'
        endIcon={<InfoIcon />}
        className='control-button bottom-button-start'
        onClick={loadDefaultMidi}
      >
        Load Example
      </Button>
      <Button
        variant="contained"
        color='primary'
        endIcon={<InfoIcon />}
        className='control-button'
        onClick={() => props.setInfoOpen(true)}
      >
        Info
      </Button>
    </Paper>



  )
}

