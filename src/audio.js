// Original synth loop and engine sound. Everything is generated locally.
export function makeRadio(){
  let context,bus,motor,motorVolume,next=0,step=0,enabled=true,playing=false;
  const chords=[[45,48,52,55],[41,45,48,52],[48,52,55,59],[43,47,50,55]];
  function setup(){
    const Audio=window.AudioContext??window.webkitAudioContext;if(context||!Audio)return;
    context=new Audio();bus=context.createGain();bus.gain.value=0;bus.connect(context.destination);
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=240;
    motor=context.createOscillator();motor.type='sawtooth';motor.frequency.value=34;motor.connect(filter);
    motorVolume=context.createGain();motorVolume.gain.value=0;filter.connect(motorVolume);motorVolume.connect(bus);motor.start();
  }
  const hz=n=>440*2**((n-69)/12);
  function note(time,freq,duration,volume,type='triangle',end){
    if(!context||!bus)return;
    const osc=context.createOscillator(),gain=context.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,time);
    if(end)osc.frequency.exponentialRampToValueAtTime(end,time+duration*.7);
    gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.012);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
    osc.connect(gain);gain.connect(bus);osc.start(time);osc.stop(time+duration+.01);
  }
  return {
    set(enabledSound,active){
      const restart=(!enabled||!playing)&&enabledSound&&active;enabled=enabledSound;playing=active;
      if(enabled&&playing){try{setup();context?.resume().catch(()=>{});}catch{}}
      if(context&&bus){bus.gain.setTargetAtTime(enabled&&playing?.32:0,context.currentTime,.045);if(restart)next=context.currentTime+.03;}
    },
    frame(speed,driving){
      if(!enabled||!playing||!context)return;
      const time=context.currentTime;
      motor.frequency.setTargetAtTime(32+speed*2.2,time,.075);motorVolume.gain.setTargetAtTime(driving?.033+speed*.00075:0,time,.065);
      if(next<time-.3)next=time+.03;
      while(next<time+.12){
        const chord=chords[Math.floor(step/16)%4],beat=step%8;
        if(step%4===0)note(next,105,.18,.108,'sine',38);
        if(step%2===1)note(next,hz(chord[0]-12+(beat===7?12:0)),.21,.066,'triangle');
        if(step%2===0)note(next,hz(chord[[0,1,3,2][(beat/2)%4]]+12),.32,.035,'triangle');
        if(step%16===0)for(const k of chord)note(next,hz(k),1.34,.019,'sine');
        if(step%4===2)note(next,280,.105,.044,'triangle',119);
        step++;next+=.238;
      }
    },
    cue(name){
      if(!context||!enabled||!playing)return;
      const t=context.currentTime+.006;
      if(name==='bump'){note(t,69,.15,.12,'triangle',27);return;}
      if(name==='checkpoint'||name==='success'){
        const tones=name==='success'?[60,64,67,72]:[69,76];tones.forEach((k,i)=>note(t+i*.077,hz(k),.29,.123,'sine'));return;
      }
      if(name==='failed'){[62,57,48].forEach((k,i)=>note(t+i*.07,hz(k),.29,.105,'triangle'));return;}
      if(name==='enter'||name==='exit')note(t,name==='enter'?194:137,.13,.11,'triangle');
    },
  };
}
