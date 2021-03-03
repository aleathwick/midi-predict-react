import React, { useState, useRef, useEffect } from "react";
import { infoContent } from '../infoContent'
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper'
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import { Typography } from "@material-ui/core";


// adapted from https://material-ui.com/components/dialogs/
export default function Info(props) {

    const handleClose = () => {
        props.setInfoOpen(false);
        console.log('closed')
    };

    const descriptionElementRef = React.useRef(null);
    React.useEffect(() => {
        if (props.infoOpen) {
            const { current: descriptionElement } = descriptionElementRef;
            if (descriptionElement !== null) {
                descriptionElement.focus();
            }
        }
    }, [props.infoOpen]);

    return (
        <Dialog
            open={props.infoOpen}
            onClose={handleClose}
            scroll={'body'}
            aria-labelledby="scroll-dialog-title"
            aria-describedby="scroll-dialog-description"
        >
            <DialogTitle id="scroll-dialog-title">Info</DialogTitle>
            <DialogContent dividers={'body'}>
                <DialogContentText
                    id="scroll-dialog-description"
                    ref={descriptionElementRef}
                    tabIndex={-1}
                >
                    <p>
                        This website provides a simple interface to deep learning models designed to predict velocities of notes in piano sequences.
                    </p>
                    <p>
                        For MIDI files to work properly with this website, they should:
                        <ul>
                            <li>Be in 4/4 time signature</li>
                            <li>Have a tempo that accurately reflects the tempo of the music</li>
                            <li>Have notes that fall closest in time to the timestamp of the actual nearest semi-quaver/16th as determined by the tempo
                            (so that notes can be quantized accurately)</li>
                            <li>Contain all notes for prediction in the first midi track</li>
                        </ul>
                    </p>
                    <p>
                        For more info, see:
                        <ul>
                            <li><a href='https://soundcloud.com/user-611170338/sets/deep-learning-and-music-humanizing-piano-scores-longer-examples'>Audio examples</a> of model outputs</li>
                            <li><a href='https://github.com/aleathwick/781-piano-autoencoder'>Github repo</a>, including datasets and code for parsing data and training models</li>
                        </ul>
                    </p>

                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Close
            </Button>
            </DialogActions>
        </Dialog>
    );
}