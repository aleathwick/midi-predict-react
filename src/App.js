import React, { useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import Typography from '@material-ui/core/Typography'
import Controls from './components/Controls'
import NotesContainer from './components/NotesContainer'
import * as tf from '@tensorflow/tfjs';
import * as Constants from './constants'


const encoderPromise = tf.loadLayersModel('models/532_tfjs_best_val_encoder_no_seq/model.json');
const decoderPromise = tf.loadLayersModel('models/532_tfjs_best_val_decoder_no_seq/model.json');

function App(props) {
  const [midiFile, setMidiFile] = useState(null);
  const [notes, setNotes] = useState(null);
  const [filteredNotes, setFilteredNotes] = useState(null);
  const [bars, setBars] = useState(Constants.BARS)
  const [encoder, setEncoder] = useState(encoderPromise);
  const [decoder, setDecoder] = useState(decoderPromise);
  const [velocityRange, setVelocityRange] = React.useState([0, 127]);

  Promise.all([props.encoderPromise, props.decoderPromse])
    .then(models => {
      // this is happening >10 times, on each render. At least the model load is only happening once.
      setEncoder(models[0])
      setDecoder(models[1])
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
      bars={bars}
      setBars={setBars}
      encoder={encoder}
      decoder={decoder}
      />
      <NotesContainer
        filteredNotes={filteredNotes}
        bars={bars}
        velocityRange={velocityRange}
      />
    </div>
  );
}

export default App;
