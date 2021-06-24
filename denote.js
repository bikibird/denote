function analyze(midi)
{
	const tracks=[]
	var tempos=midi.header.tempos
	midi.result=null
	
	//Check for simultaneous notes and split into multiple tracks
	midi.tracks.filter(track=>track.notes.length>0).forEach(track=>
	{
		var tempTracks=[[]]
		tempTracks[0].instrument=[[track.instrument.family,track.instrument.name].join(": "),track.instrument.number].join(" - ")

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
					if(!tempTracks[tempIndex])
					{
						tempTracks[tempIndex]=[]
						tempTracks[tempIndex].instrument=[[track.instrument.family,track.instrument.name].join(": "),track.instrument.number].join(" - ")
					}
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
			if (note.durationTicks>0)
			{
				tempTracks[tempIndex].push(note)
				tempIndex=0	
			}	
		})
		tempTracks.forEach(track=>
		{
			track.trackIndex=0
			tracks.push(track)

		})
	})
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
		
		
		tracks.forEach(track=>
		{
			tempo.channels[channelIndex].instrument=track.instrument	
			while (track.trackIndex<track.length && (!tempo.stop || track[track.trackIndex].ticks<tempo.stop))
			{ 
				
				if(track[track.trackIndex].durationTicks>0)
				{
					
					tempo.channels[channelIndex].push(
					{
						pitch:track[track.trackIndex].midi-36,
						volume:Math.floor(7*track[track.trackIndex].velocity+.5),
						ticks:track[track.trackIndex].ticks,
						durationTicks:track[track.trackIndex].durationTicks
					})
				}	
				track.trackIndex++
			}
			channelIndex++
			tempo.channels[channelIndex]=tempo.channels[channelIndex]?tempo.channels[channelIndex]:[]
			tempo.channels[channelIndex].instrument=track.instrument
		})
		tempo.channels=tempo.channels.filter(channel=>channel.length>0 && !isEmptyChannel(channel))		
	})
	midi.result={sections:tempos}
	return midi
}

function convert(midi)
{

	const formatNote=(n)=>
	{
		var note=(0x10000+n).toString(16).substr(-4)
		return note.substr(2,2)+note.substr(0,2)
	}
	const formatByte=(n)=>(0x100+n).toString(16).substr(-2)
	
	var ppq=midi.header.ppq
		var tempos=midi.result.sections
	var pico8 =
	{
		effects:{"None":0, "Slide":4096, "Vibrato":8192, "Drop":12388, "Fade In":16384, "Fade Out":20480, "Fast Arpeggio":24576, "Slow Arpeggio":28762},
		volumes:[0, 512, 1024, 1536, 2048, 2560, 3072, 3584],
		instruments:{"Triangle": 0, "Tilted Saw": 64, "Saw": 128, "Square": 192, "Pulse": 256, "Organ": 320, "Noise": 384, "Phaser" :448, "Custom 0": 32768, "Custom 1": 32832,"Custom 2": 32896,"Custom 3": 32960,"Custom 4": 33024,"Custom 5": 33088,"Custom 6": 33152,"Custom 7": 33216},
	}
	midi.result.pico8Data={sfx:[],music:[]}
	var sfxes=[]
	var patterns=[]
	
	var startTick = function()
	{
		var start=Infinity
		tempos.filter(tempo=>tempo.include).forEach(tempo=>
		{	
			tempo.channels.filter(track=>track.include).forEach(track=>
			{
				for (let index = 0; index < track.length; index++) 
				{
					if(track[index].volume>0 )
					{
						if (track[index].ticks<start)
						{
							start=track[index].ticks
						}
						break
					}
				}
			})
		})	
		return start
	}()
	tempos.forEach((tempo,tempoIndex)=>
	{
		var resolution=ppq*4/tempo.granularity
		tempo.channels.forEach((channel,channelIndex)=>
		{
			
			var sfx=""
			channel.forEach(note=>
			{
				if (note.ticks>=startTick)
				{
					var duration=note.durationTicks
					var beats=Math.floor(note.durationTicks/resolution +.5)
				}
				else
				{
					var duration=note.durationTicks+note.ticks-startTick
					if (duration>0)
					{
						var beats=Math.floor(note.durationTicks/resolution +.5)
					}
					
				}	
				if (duration>0)
				{
					for (let i = 0; i< beats; i++)
					{
						if(note.volume>0)
						{
							if (i===0)
							{
								if (channel.attack===-1){sfx=sfx+"0000"}
								else
								{
									sfx=sfx+formatNote(note.pitch +pico8.volumes[note.volume]+channel.attack+channel.instrument)
								}	
							}
							else
							{
								if (i===beats-1)
								{
									if (channel.release===-1){sfx=sfx+"0000"}
									else
									{
										sfx=sfx+formatNote(note.pitch +pico8.volumes[note.volume]+channel.release+channel.instrument)
									}
								}	
								else
								{
									if (channel.sustain===-1){sfx=sfx+"0000"}
									else
									{
										sfx=sfx+formatNote(note.pitch +pico8.volumes[note.volume]+channel.sustain+channel.instrument)
									}	
								}
							}
						}
						else{sfx=sfx+"0000"}	
					}
				}		
				channel.sfx=sfx
				channel.music=[]
			})
		})
	})	
	let i,step,sfx,remainder,sfxIndex
	tempos.forEach((tempo,tempoIndex)=>
	{
		if (tempo.include)
		{
			tempo.channels.forEach((channel,channelIndex)=>
			{
				if (channel.include)
				{
					
					var speed=Math.floor((7200/ppq)*ppq*4/tempo.granularity/tempo.bpm +.5)
					i=0
					while(i<channel.sfx.length && sfxes.length < 65)
					{
						remainder=channel.sfx.length-i
						step=(remainder>128)?128:remainder
						sfx=formatByte(sfxes.length)+channel.sfx.slice(i,i+step).padEnd(128,"01")+formatByte(channel.sfxFilter)+formatByte(speed)
						if (step < 128){sfx=sfx+formatByte(step/4)+"00"}
						else {sfx=sfx+"0000"}

						if (sfx.slice(2,130)==="".padEnd(128,"01")&&channelIndex!==0){channel.music.push(64)}//mute channel
						else
						{
							sfxIndex=sfxes.findIndex(s=>s.slice(2)===sfx.slice(2))
							if (sfxIndex===-1){channel.music.push(sfxes.push(sfx)-1)}
							else {channel.music.push(sfxIndex)}
						}
						i=i+step
					}
				}	
			})
			var channels=tempo.channels.filter(channel=>channel.include).slice(0,4)
			
			for (let i = 0; i < Math.max(...channels.map((channel=>channel.music.length))); i++)
			{
				
				if (!(tempo.channels.every(channel=>channel.music[i]===64)))
				{

					patterns.push(
					[
						channels[0]?.music[i]??64,
						channels[1]?.music[i]??64,
						channels[2]?.music[i]??64,
						channels[3]?.music[i]??64,
					])
				}
			}
		}	
	})

	sfxes=sfxes.slice(0,64)
	patterns=patterns.slice(0,64)
	var result="[sfx]"+formatByte(sfxes.length)+formatByte(patterns.length)
	sfxes.forEach(sfx=>result=result+sfx)
	patterns.forEach((pattern,index)=>
		{
			result=result+formatByte(pattern[0])+formatByte(pattern[1])+formatByte(pattern[2])+formatByte(pattern[3])
			if (index <patterns.length-1){result=result+"0"}
			else{result=result+"4"}
		})
	midi.result={sfx:result+"[/sfx]",sections:tempos,sfxes:sfxes,music:patterns}
	return midi

}
function isEmptyChannel(channel)
{
	result=true
	for (note of channel)
	{
		if (note.pitch > 0 && note.volume > 0 && note.durationTicks > 0)
		{
			result = false
			break
		}
	}
	return result
}
function countSilence(channel)
{
	var counter=0
	for (note of channel)
	{
		if (note.volume === 0)
		{
			counter++
		}
		else {break}
	}
	return counter
}