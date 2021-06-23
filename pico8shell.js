// Heavily stripped down version of the default shell for PICO-8 0.2.2
// This file is available under a CC0 license https://creativecommons.org/share-your-work/public-domain/cc0/
// (note: "this file" does not include any cartridge or cartridge artwork injected into a derivative html file when using the PICO-8 html exporter)
	var canvas = document.getElementById("canvas");
	Module = {};
	Module.canvas = canvas;
	
	var pico8_audio_context;

	function p8_create_audio_context()
	{
		if (pico8_audio_context) 
		{
			try {
				pico8_audio_context.resume();
			}
			catch(err) {
				console.log("** pico8_audio_context.resume() failed");
			}	
			return;
		}

		var webAudioAPI = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext;			
		if (webAudioAPI)
		{
			pico8_audio_context = new webAudioAPI;

			// wake up iOS
			if (pico8_audio_context)
			{
				try {
					var dummy_source_sfx = pico8_audio_context.createBufferSource();
					dummy_source_sfx.buffer = pico8_audio_context.createBuffer(1, 1, 22050); // dummy
					dummy_source_sfx.connect(pico8_audio_context.destination);
					dummy_source_sfx.start(1, 0.25); // gives InvalidStateError -- why? hasn't been played before 
					//dummy_source_sfx.noteOn(0); // deleteme
				}
				catch(err) {
					console.log("** dummy_source_sfx.start(1, 0.25) failed");
				}
			}
		}
	}
	var p8_is_running = false;
	var p8_script = null;
	//var Module = null;
	function p8_run_cart()
	{
		if (p8_is_running) return;
		p8_is_running = true;
		p8_create_audio_context();
		e = document.createElement("script");
		p8_script = e;
		e.onload = function(){

			cartdata=_cartdat

		}
		e.type = "application/javascript";
		e.src = "audition.js";
		e.id = "e_script";
		
		document.body.appendChild(e); // load and run

		// hide start button and show canvas / menu buttons. hide start button
		el = document.getElementById("p8_start_button");
		if (el) el.style.display="none";
	}