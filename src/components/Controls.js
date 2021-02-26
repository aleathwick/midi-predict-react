import React, { useState, useRef, useEffect } from "react";
import Paper from '@material-ui/core/Paper'
import Button from '@material-ui/core/Button'
import CloudUploadIcon from '@material-ui/icons/Publish';
import CloudDownloadIcon from '@material-ui/icons/GetApp';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import Typography from '@material-ui/core/Typography'
import { Midi } from '@tonejs/midi'
import * as Constants from '../constants'
import Slider from '@material-ui/core/Slider';
import * as Utils from '../utils'
import * as tf from '@tensorflow/tfjs';
import clonedeep from "lodash.clonedeep"
import cloneDeep from "lodash.clonedeep";

// replace midi
// set up separate midi file download for predicted bars only
// download button saying (download last prediction)

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
  
  const [midiDownloadLink, setMidiDownloadLink] = useState()



  // get a reference for the input element, so it can be triggered
  const inputRef = useRef()
  function getInput() {
    inputRef.current.click();
  }

  function predictVelocity() {
    // don't want this in place - want to use setState to replace previous midi
    const modelInputs = modelInputsFromNotes(props.filteredNotes)
    console.log(props.encoder.summary());
    let modelInputsFormatted = props.encoder.inputs.map(input => modelInputs[input.originalName]);
    console.log(props.encoder.inputs)
    let encoded = props.encoder.predict(modelInputsFormatted, { batchSize: 1 });
    let vnOut = tf.zeros([1, 1, 1]);
    let predPromises = [];
    for (let i = 0; i < encoded.shape[1]; i++) {
      let stepInput = { encoded: encoded.slice([0, i, 0], [1, 1, encoded.shape.slice(-1)[0]]), Vn_ar: vnOut };
      let stepInputFormatted = props.decoder.inputs.map(input => stepInput[input.originalName])
      vnOut = props.decoder.predict(stepInputFormatted, { batchSize: 1 });
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

        // file for download
        // cloneDeep doesn't work for whole midi file...
        // use Object.create instead
        const midiFileDownload = Object.create(props.midiFile)
        midiFileDownload.tracks[0].notes = newFilteredNotes
        const midiBlob = new Blob([midiFileDownload.toArray()], { type: "octet/stream" })
        setMidiDownloadLink(URL.createObjectURL(midiBlob))
        props.midiFile.tracks[0].notes = newNotes
      })
  }

  // reader, for reading the received file
  const reader = new FileReader();
  // when file is loaded, process
  reader.addEventListener('load', function () {
    // read file into new Midi object
    const midi = new Midi(reader.result);
    if (midi.tracks.length > 1) alert("midi file has more than one track, first will be used");
    preprocessMidi(midi)


    // processMidi(midi);
  }, false)

  // function for dealing with file selection (attach as onChange event handler)
  function fileReceived(e) {
    // if user clicks 'cancel' on file dialogue, e will be undefined
    if (typeof e === 'undefined') return null;
    console.log(e.target.files)
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
      <Typography variant='h4'>File Controls</Typography>

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
        disabled={props.encoder === null || props.decoder === null || props.midiFile === null}
        endIcon={<MusicNoteIcon />}
        className='control-button'
        onClick={predictVelocity}
      >
        Predict
      </Button>

      <Button
        variant="contained"
        color='secondary'
        endIcon={<CloudDownloadIcon />}
        className='control-button'
        disabled={props.midiFile === null}
        href={midiDownloadLink}
        download="output.midi"
      >
        Download Prediction
      </Button>
      <Slider
        defaultValue={Constants.BARS}
        getAriaValueText={value => `${value} bars`}
        min={1}
        max={12}
        valueLabelDisplay={props.midiFile === null ? 'off' : 'on'}
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
      <Slider
        min={0}
        max={127}
        value={props.velocityRange}
        // need to fix this
        // onMouseUp={(e) => {const newValue = parseInt(e.target.ariaValueNow); props.setVelocityRange(newValue); updateMidi(props.midiFile, newValue)}}
        onChange={(e, v) => { props.setVelocityRange(v); console.log(v) }}
      />


    </Paper>


  )
}

