export default function getNotes(midi){ 
    return midi.tracks[0].notes
}

export function remapVelocity(v, lower, upper){
    return Math.min(Math.max((v - lower / 127) / (upper / 127 - lower / 127), 1/127), 1)
    // Math.min(Math.max((velocity - props.velocityRange[0] / 127) / (props.velocityRange[1] / 127 - props.velocityRange[0] / 127), 0), 1
}

