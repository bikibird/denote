function convert(midi,granularity=2)
{
	const channels=[[]]
	const tracks=[]
	var ppq=midi.header.ppq
	var resolution=ppq/granularity
	var tempoIndex=0
	var channelIndex=0
	var tempo=120
	var tempos=midi.header.tempos
	//Check for simultaneous notes and split into multiple tracks
	midi.tracks.filter(track=>track.notes.length>0).forEach(track=>
	{
		var tempTracks=[[]]
		var tempIndex=0
		var lastNote
		var rest
		var nextTiming
		track.notes.forEach((note,index)=>
		{
			if (index>0)
			{
				while(note.ticks===tempTracks[tempIndex][tempTracks[tempIndex]?.length-1]?.ticks)
				{
					tempIndex++
					if(!tempTracks[tempIndex]){tempTracks[tempIndex]=[]}
				}
			}
			if(tempTracks[tempIndex].length>0)
			{
				//Check for rest.
				lastNote=tempTracks[tempIndex][tempTracks[tempIndex].length-1]
				nextTiming=lastNote.ticks+lastNote.durationTicks
				rest=note.ticks-nextTiming
				
			}
			else
			{
				nextTiming=0
				rest=note.ticks-nextTiming
			}
			if(rest>0)
			{
				tempTracks[tempIndex].push({midi: 36, velocity: 0, noteOffVelocity: 0, ticks: nextTiming, durationTicks: rest})
			}
			tempTracks[tempIndex].push(note)
			tempIndex=0	
		})
		tempTracks.forEach(track=>
		{
			track.trackIndex=0
			tracks.push(track)

		})
	})
	var sections=[]
	var sectionIndex=0
	var tempos=[]
	if (midi.header.tempos.length===0){tempos.push({bpm:120,start:0})}
	midi.header.tempos.forEach((tempo,index,midiTempos)=>
	{
		tempos.push({bpm:tempo.bpm,start:tempo.ticks, stop:midiTempos[index+1]?.ticks})
	})
	
	tempos.forEach(tempo=>
	{
		tempo.channels=[[]]
		var channelIndex=0
		speed=Math.floor((7200/ppq)*resolution/tempo.bpm +.5)
		tracks.forEach(track=>
		{
			while (track.trackIndex<track.length && (!tempo.stop || track[track.trackIndex].ticks<tempo.stop))
			{ 
				
				if(track[track.trackIndex].durationTicks>0)
				{
					
					tempo.channels[channelIndex].push(
					{
						pitch:track[track.trackIndex].midi-36,
						speed:speed,
						beats:Math.floor(track[track.trackIndex].durationTicks/resolution +.5),
						volume:Math.floor(7*track[track.trackIndex].velocity+.5),
						start:track[track.trackIndex].ticks
					})
				}	
				track.trackIndex++
			}
			channelIndex++
			tempo.channels[channelIndex]=tempo.channels[channelIndex]?tempo.channels[channelIndex]:[]
		})
		tempo.channels=tempo.channels.filter(channel=>channel.length>0)		
	})

}


