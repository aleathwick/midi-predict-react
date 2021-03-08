import React, { useState, useRef } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Controls from './components/Controls'
import NotesContainer from './components/NotesContainer'
import Info from './components/Info'
import * as tf from '@tensorflow/tfjs';
import * as Constants from './constants'


// const encoderPromise = tf.loadLayersModel('/models/532_tfjs_best_val_encoder_no_seq/model.json');
// const decoderPromise = tf.loadLayersModel('/models/532_tfjs_best_val_decoder_no_seq/model.json');

function App(props) {
  const [midiFile, setMidiFile] = useState(null);
  const [notes, setNotes] = useState(null);
  const [filteredNotes, setFilteredNotes] = useState(null);
  const [bars, setBars] = useState(Constants.BARS)
  const [velocityRange, setVelocityRange] = React.useState([0, 127]);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const encoderRef = useRef(null)
  const decoderRef = useRef(null)

  Promise.all([props.encoderPromise, props.decoderPromise])
    .then(models => {
      // this is happening >10 times. At least the model load is only happening once.
      encoderRef.current = models[0]
      decoderRef.current = models[1]
    })
    .catch(function (err) {
      console.log('model failed to load')
      console.log(err.message)
    })

  return (
    <div id="app-container">
      
      <Controls
      midiFile={midiFile}
      setMidiFile={setMidiFile}
      notes={notes}
      setNotes={setNotes}
      filteredNotes={filteredNotes}
      setFilteredNotes={setFilteredNotes}
      velocityRange={velocityRange}
      setVelocityRange={setVelocityRange}
      setInfoOpen={setInfoOpen}
      bars={bars}
      setBars={setBars}
      encoderRef={encoderRef}
      decoderRef={decoderRef}
      />
      <NotesContainer
        filteredNotes={filteredNotes}
        bars={bars}
        velocityRange={velocityRange}
      />
      <Info
      infoOpen={infoOpen}
      setInfoOpen={setInfoOpen}
      />
    </div>
  );
}

export default App;
