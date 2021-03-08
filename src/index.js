import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as tf from '@tensorflow/tfjs';


const encoderPromise = tf.loadLayersModel(process.env.PUBLIC_URL + '/models/532_tfjs_best_val_encoder_no_seq/model.json')
const decoderPromise = tf.loadLayersModel(process.env.PUBLIC_URL + '/models/532_tfjs_best_val_decoder_no_seq/model.json')

Promise.all([encoderPromise, decoderPromise])
  .then(models => {
    console.log(models)
    console.log('models loaded successfully')
  }
  )

ReactDOM.render(
    <React.StrictMode>
      <App
        encoderPromise={encoderPromise}
        decoderPromise={decoderPromise}
      />
    </React.StrictMode>,
    document.getElementById('root')
  );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
