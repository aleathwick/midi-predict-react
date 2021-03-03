import React, { useState, useRef, useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper'
import * as Constants from '../constants'
import * as Utils from '../utils'


export default function NotesContainer(props) {

  function velocityToColour(velocity) {
    const remappedVelocity = Utils.remapVelocity(velocity, props.velocityRange[0], props.velocityRange[1])
    return `hsl(${remappedVelocity * 150}, 100%, 50%)`
  }

  const noteBoxes = (props.filteredNotes ? props.filteredNotes.map(note => {
    // this will create a warning about each child having a unique key, but this doesn't really matter, as order is always the same
    return <div className='note-box' style={{ gridColumn: note.subbeat + 1, gridRow: 88 - (note.midi - Constants.MIDI_A0 + 1), backgroundColor: velocityToColour(note.velocity)}} />
  }) : []
  )

  return (
    <Paper id="notes-container" style={
      {'gridTemplateColumns': `repeat(${props.bars * Constants.BEATS * Constants.SUBBEATS}, 1fr)`}
    }>
      {noteBoxes}
    </Paper>
  )
}