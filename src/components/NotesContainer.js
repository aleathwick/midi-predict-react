import React, { useState, useRef, useEffect } from "react";
import { makeStyles } from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import Paper from '@material-ui/core/Paper'
import * as Constants from '../constants'
import * as Utils from '../utils'


export default function NotesContainer(props) {

  function velocityToColour(velocity) {
    const remappedVelocity = Utils.remapVelocity(velocity, props.velocityRange[0], props.velocityRange[1])
    return `hsl(${remappedVelocity * 150}, 100%, 50%)`
  }

  const barLines = []
  for(var bar = 1; bar < props.bars; bar++){
    console.log((bar) * Constants.BEATS * Constants.SUBBEATS)
   barLines.push(
    <div
    style={{
      // backgroundColor: 'rgba(1, 1, 1, 0.03)',
      borderRight: 'solid',
      borderColor: 'rgba(1, 1, 1, 0.1)',
      borderWidth: '1px',
      // margin: `${10/props.bars}px`,
      // could set loop to bar+=2, and use a whole bar background shading effect:
      // gridColumn: `${(bar) * Constants.BEATS * Constants.SUBBEATS + 1} / ${(bar) * Constants.BEATS * Constants.SUBBEATS + 1 + 16}`,
      gridColumn: (bar) * Constants.BEATS * Constants.SUBBEATS,
      gridRow: '1 / -1',
    }}>

  </div>
  )}

  const noteBoxes = (props.filteredNotes ? props.filteredNotes.map(note => {
    // this will create a warning about each child having a unique key, but this doesn't really matter, as order is always the same
    return (
      <Tooltip
      enterDelay='0'
      title={<div style={{'whiteSpace': 'pre'}}>
        Velocity: {Math.round(note.velocity * 127)}<br/>
        Scaled Velocity: {Math.round(Utils.remapVelocity(note.velocity, props.velocityRange[0], props.velocityRange[1]) * 127)}<br/>
        Pitch class: {(note.midi - 4) % 12}
          </div>}>
        <div
          className='note-box'
          style={{ gridColumn: note.subbeat + 1, gridRow: 88 - (note.midi - Constants.MIDI_A0 + 1), backgroundColor: velocityToColour(note.velocity) }}
        />
      </Tooltip>
    )
  }) : []
  )

  return (
    <Paper id="notes-container" style={
      { 'gridTemplateColumns': `repeat(${props.bars * Constants.BEATS * Constants.SUBBEATS}, 1fr)` }
    }>
      {barLines}
      {noteBoxes}
    </Paper>
  )
}