// DOM elements.
const roomselectioncontainer = document.getElementById('room-selection-container')
const roominput = document.getElementById('room-input')
const connectbtn = document.getElementById('connect-button')
const disconnectbtn = document.getElementById('disconnect-button')
const sharescreen = document.getElementById('share-screen')
const hidelocalbox = document.getElementById('hide-localbox')
const videochatcontainer = document.getElementById('video-chat-container')
const localvideocomponent = document.getElementById('local-video')
const remotevideocomponent = document.getElementById('video-chat-container')
const socket = io()
//  stun/turn servers.
const iceservers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  //  { urls: 'stun:stun3.l.google.com:19302' }
  ],
}

// initial recoder global variable
var chunks = [];
var mediarecorder
// record audio or video
var blob
// control webcam and audio
var mediaconstraints
// var for mode video or audio 
var mode = 0
// var audioURL
var recoder


let senders = []
let localstream
let remotestream
let sharestream
let isconnectcreator
// Connection between the local device and the remote peer.
var rtcpeerconnection = {}
let roomid
let clientid
let lastconnect

// -------------------------set element event binding-------------------------------


// click button event binding function
connectbtn.addEventListener('click', async () => {
  try{
    if (mode === 0){
      mode = parseInt(document.querySelector('input[name="location"]:checked').value);
    }
    if(mode === 1){
      mediaconstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: false
      }
    }else if(mode === 2){
      mediaconstraints = {
        audio: false,
        video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: {max: 30}
        }
      }
    }
    else if(mode === 3){
      mediaconstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
      },video: {
          width: { max: 1280 },
          height: { max: 720 },
          frameRate: {max: 30}
        }
      }
    }
    else{
      alert('plz check your mode')
    }
    joinRoom(roominput.value);
  }catch (error) {
    alert('plz check your mode')
  }
})


// click button event binding function
disconnectbtn.addEventListener('click', () => {
  leaveRoom(roominput.value,clientid)
})


// click button event binding function
sharescreen.addEventListener('click', () => {
  if(sharescreen.value == "0"){
    startShareScreen(mediaconstraints)
    sharescreen.value = "1"
    sharescreen.innerHTML = "stop share"
  }else if(sharescreen.value == "1"){
    stopShareScreen(mediaconstraints)
    sharescreen.value = "0"
    sharescreen.innerHTML = "share screen"
  }
})


// click button event binding function
hidelocalbox.addEventListener('click', () => {
  if(hidelocalbox.value == "0"){
    localvideocomponent.srcObject = undefined;
    hidelocalbox.value = "1"
    hidelocalbox.innerHTML = "show localbox"
  }else if(hidelocalbox.value == "1"){
    if(sharescreen.value == "0"){
      localvideocomponent.srcObject = localstream;
    }else if(sharescreen.value == "1"){
      localvideocomponent.srcObject = sharestream;
    }
    hidelocalbox.value = "0"
    hidelocalbox.innerHTML = "hide localbox"
  }
})


// before close window or reload page warning
window.addEventListener("beforeunload", function(event) {
  event.returnValue = ''
})


// close window or reload page will disconnect room
window.addEventListener("unload", function(event) {
  leaveRoom(roominput.value,clientid)
})


// -------------------------set socket event -------------------------------

// set client id
socket.on('connect', () => {
  if (clientid == undefined){
    clientid = socket.id;
  console.log('your client id :',socket.id)
  }
});


// click button > socket created room event callbacks
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')
})


// click button >  event callbacks join room
socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')
  // start connect
  socket.emit('start_call', roomid)
})


// click button > event callbacks room people fulled
socket.on('full_room', () => {
  console.log('Socket event callback: full_room')
  alert('The room is full, please try another one')
  leaveVideoConference({'F':'all','T':'all'})
})


// 1
socket.on('start_call', async (event) => {
  isconnectcreator = true
  console.log('Socket event callback: start_call from',event.F,'to',event.T)
  if (event.lastconnect == true){
    console.log('this connect is last connect')
    lastconnect = true
  }
  // if roomcreator is true : means this room no person 
  if (isconnectcreator) {
    var peerid = event.F +'_'+ event.T
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcpeerconnection[peerid] = new RTCPeerConnection(iceservers)
    // setting local stream
    addLocalTracks(peerid)
    if(mediarecorder == undefined){
      startRecord(roomid)
      openBtn()
    }
    // add local stream to track remote stream
    rtcpeerconnection[peerid].ontrack = function(event){
      event.peerid = peerid
      setRemoteStream(event)
      socket.emit('start_call', roomid)
    }
    // icecandidate(ICE) event : find shortest path
    rtcpeerconnection[peerid].onicecandidate = function(event){
      event.peerid = peerid
      sendIceCandidate2offer(event)
    }
    await createOffer(peerid)
  }
})


// 2
socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer from',event.F,'to',event.T)
  // if roomcreator is false : means this room has person 
  if (!isconnectcreator) {
    var peerid = event['peerid']
    // creat new peerconnect ,and use ice server information(stun or turn server)
    rtcpeerconnection[peerid] = new RTCPeerConnection(iceservers)
    addLocalTracks(peerid)
    if(mediarecorder == undefined){
      startRecord(roomid)
      openBtn()
    }
    rtcpeerconnection[peerid].ontrack = function(event){
      event.peerid = peerid
      setRemoteStream(event)
    }
    rtcpeerconnection[peerid].onicecandidate = function(event){
      event.peerid = peerid
      sendIceCandidate2answer(event)
    }
    // RTCSessionDescription : return our info to remote computer
    rtcpeerconnection[peerid].setRemoteDescription(new RTCSessionDescription(event['sdp']))
    await createAnswer(peerid)
  }else{
    console.log('webrtc_offer Error!')
  }
})


// 1
socket.on('webrtc_answer', (event) => {
  if(isconnectcreator){
    var peerid = event['peerid']
    console.log('Socket event callback: webrtc_answer from',event.F,'to',event.T)
    rtcpeerconnection[peerid].setRemoteDescription(new RTCSessionDescription(event['sdp']))
  }
  if(lastconnect == true){
    isconnectcreator = false
    lastconnect = undefined
  }
})


socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate from',event.F,'to',event.T)
  // ICE candidate configuration.
  var candidates = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcpeerconnection[event.peerid].addIceCandidate(candidates)
})


socket.on('leave_room', (event) => {
  removeRemoteStream(event)
  console.log('clinet:'+event['F']+' leave room')
})


socket.on('close_room', async (event) => {
  // leaveVideoConference(event)
  alert('room close');
  // alert('WARNING!! :Plz wait for the transfer to complete before closing this page!!');
})


socket.on('transfer_complete', async () => {
  mode = 0
  roomid,clientid,recoder,mediarecorder = undefined,undefined,undefined,undefined
  chunks = [];
  alert('transfer record complete!');
})


// -------------------------set logic function-------------------------------

// this function into room and send room id
async function joinRoom(room) {
  if (room === '') {
    alert('Please enter a room ID')
  } else {
    // get user local camera streams
    await setLocalStream(mediaconstraints)
    roomid = room
    console.log("roomURL: ",location.href.split('?')[0]+'?mode='+mode+"&room="+roomid)
    socket.emit('join', room)
    showVideoConference()
  }
}


// this function to leave room 
function leaveRoom(room,client){
  stopRecord(room)
  if (room === '') {
    alert('no room number')
  } else {
    socket.emit('leave', {room:room,client:client})
    leaveVideoConference({'F':client,'T':'all'})
    alert('video coference closed, if you need new coversation, plz enter new room number');
    // alert('WARNING :plz wait for the transfer to complete before closing this page!!');
  }
}


// this function to start record
function startRecord(room){
  // recoder stream
  mediarecorder = new MediaRecorder(localstream)
  // set stream mode (video or audio) 
  if(mode === 1){
    mediarecorder.mimeType = 'audio/webm; codecs=opus';
    console.log("recorder started");

  }else if(mode === 2 || mode === 3){
    mediarecorder.mimeType = 'video/webm; codecs=h264';
    // mediarecorder.audioChannels = 2;
    console.log("recorder started");
  }else{
    console.log('can\'t recorde, plz check your mode')
  }
  socket.emit('record_time',{roomid:room,clientid:clientid,mode:'start'})
  // set 10 sec trigger dataavailable and cut blob
  mediarecorder.start(10000);
  // event function
  mediarecorder.ondataavailable = function(e) {
    chunks.push(e.data);
    socket.emit('upload_blob',{data:chunks.shift(),roomid:room,clientid:clientid,mode:1});
    console.log('upload record !!');
  }
}


// this function to stop record
function stopRecord(room){
  if(mediarecorder != undefined){
    mediarecorder.stop()
    socket.emit('record_time',{roomid:room,clientid:clientid,mode:'stop'})
    console.log("recorder stopped");
    var atlast = chunks.length
    console.log("there are",atlast,"data need upload")
    if(atlast != 0){
      for (let i = 0; i < atlast; i++) {
        if(i == atlast-1){
          socket.emit('upload_blob',{data:chunks[i],roomid:room,clientid:clientid,mode:0})
        }else{
          socket.emit('upload_blob',{data:chunks[i],roomid:room,clientid:clientid,mode:1})
        }
      }
    }else{
      socket.emit('upload_blob',{data:[0],roomid:room,clientid:clientid,mode:0})
    }
  }
}


// start sharescreen function
async function startShareScreen(mediaconstraints){
  var displayconstraints =  mediaconstraints
  displayconstraints.video = {width: { max: 1920 },height: { max: 1080 },frameRate: {max: 30},cursor: "always"}
  displayconstraints.audio = false
  try {
    sharestream = await navigator.mediaDevices.getDisplayMedia(displayconstraints)
    localvideocomponent.srcObject = sharestream
    // senders.find(sender => sender.track.kind === 'video').replaceTrack(sharestream.getTracks()[0])
    for(i=0;i<senders.length;i++){
      if(senders[i].track.kind === 'video'){
        senders[i].replaceTrack(sharestream.getTracks()[0]);
      }
    }
  } catch (error) {
    console.error('Could not get user screen', error)
    sharescreen.value = "0"
    sharescreen.innerHTML = "share screen"
  }
}


// stop sharescreen function
function stopShareScreen(){
  // senders.find(sender => sender.track.kind === 'video').replaceTrack(localstream.getTracks().find(track => track.kind === 'video'));
  for(i=0;i<senders.length;i++){
    if(senders[i].track.kind === 'video'){
      senders[i].replaceTrack(localstream.getTracks().find(track => track.kind === 'video'));
    }
  }
  sharestream.getTracks()[0].stop()
  sharestream = undefined;
  localvideocomponent.srcObject = localstream
}


// this function cancle video display none if into room and get local camera stream
function showVideoConference() {
  roomselectioncontainer.style = 'display: none'
  videochatcontainer.style = 'display: block'
  disconnectbtn.disabled = false;
  disconnectbtn.innerHTML = 'leave Room';
}


// leave video conference
function leaveVideoConference(event) {
  // hide video div and show choose page
  roomselectioncontainer.style = 'display: block'
  videochatcontainer.style = 'display: none'
  // if share screem not stop ,clear variable and stop it.
  if(sharestream != undefined){
    stopShareScreen()
  }
  // stop localstream 
  trclen = Object.keys(rtcpeerconnection).length
  if(trclen != 0){
    for (var i = 0; i < trclen; i++) {
      rtcpeerconnection[Object.keys(rtcpeerconnection)[0]].getSenders().forEach(function(sender) {
        sender.track.stop();
      });
      rtcpeerconnection[Object.keys(rtcpeerconnection)[0]].close();
    }
  }
  // stop track
  a = localstream.getTracks().length
  if(localstream.getTracks().length != 0){
    for(i=0;i<a;i++){
      localstream.getTracks()[0].stop()
    }
  }
  // close button
  closeBtn()
  // reset const
  senders = [];
  // reset variable
  localstream,remotestream,isconnectcreator,mediaconstraints,isconnectcreator,roomid = undefined,undefined,undefined,undefined,undefined,undefined
  c = 0
}


function removeRemoteStream(event) {
  var d = document.getElementById(event['F']+'_'+event['T']) || document.getElementById(event['T']+'_'+event['F'])
  try{
    d.remove()
  }catch(error){
    console.log(d)
  }
  if(rtcpeerconnection[event['F']+'_'+event['T']]){
    rtcpeerconnection[event['F']+'_'+event['T']].close();
    delete rtcpeerconnection[event['F']+'_'+event['T']]
  }else{
    try{
      rtcpeerconnection[event['T']+'_'+event['F']].close();
      delete rtcpeerconnection[event['T']+'_'+event['F']]
    }catch(error){}
  }
}


// this function get user camera stream(local)
async function setLocalStream(mediaconstraints) {
  let stream
  try {
    // if calback ,show stream and audio
    stream = await navigator.mediaDevices.getUserMedia(mediaconstraints)
  }catch(error){
    console.error('Could not get user media', error)
    alert('error,check your microphone and webcame')
    leaveVideoConference({'F':'all','T':'all'})
  }
  localstream = stream
  localvideocomponent.srcObject = stream
}


// add local stream to webrtc track
function addLocalTracks(peerid) {
  localstream.getTracks().forEach(
    track => senders.push(rtcpeerconnection[peerid].addTrack(track, localstream))
  )
}


// 1
async function createOffer(peerid) {
  // var sessionDescription
  try {
    var sessionDescription = await rtcpeerconnection[peerid].createOffer()
    rtcpeerconnection[peerid].setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }
  console.log('creat offer from',peerid.split('_')[1],'to',peerid.split('_')[0])
  socket.emit('webrtc_offer', {
    type: 'webrtc_offer',
    sdp: sessionDescription,
    roomid,
    peerid:peerid,
    F:peerid.split('_')[1],
    T:peerid.split('_')[0]
  })
}


// 2
async function createAnswer(peerid) {
  // var sessionDescription
  try {
    var sessionDescription = await rtcpeerconnection[peerid].createAnswer()
    rtcpeerconnection[peerid].setLocalDescription(sessionDescription)
  } catch (error) {
    console.error(error)
  }
  console.log('creat answer from',peerid.split('_')[0],'to',peerid.split('_')[1])
  
  socket.emit('webrtc_answer', {
    type: 'webrtc_answer',
    sdp: sessionDescription,
    roomid,
    peerid:peerid,
    F:peerid.split('_')[0],
    T:peerid.split('_')[1]
  })
}


// set remote stream 
function setRemoteStream(event) {
  if(document.getElementById(event.peerid)!= null){
    document.getElementById(event.peerid).remove();
  }
  var div = document.createElement("video");
  div.setAttribute("class", "remote-video");
  div.setAttribute("id", event.peerid);
  div.setAttribute("autoplay", "autoplay");
  div.setAttribute("playsInline", "playsInline");
  div.srcObject = event.streams[0]
  remotevideocomponent.insertBefore(div, localvideocomponent.nextSibling);
  remotestream = event.stream
}


// send candidate event to server 
async function sendIceCandidate2offer(event) {
  var peerid = event.peerid
  if (event.candidate) {
    await socket.emit('webrtc_ice_candidate', {
      roomid,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
      peerid:peerid,
      F:peerid.split('_')[1],
      T:peerid.split('_')[0]
    })
  }
}


// send candidate event to server 
async function sendIceCandidate2answer(event) {
  var peerid = event.peerid
  if (event.candidate) {
    await socket.emit('webrtc_ice_candidate', {
      roomid,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
      peerid:peerid,
      F:peerid.split('_')[0],
      T:peerid.split('_')[1]
    })
  }
}


// open button
function openBtn(){
  if( mode == 2 || mode == 3){
    sharescreen.disabled = false;
    hidelocalbox.disabled = false
  }else if(mode == 1){
    sharescreen.disabled = true;
    hidelocalbox.disabled = true
  }
}


// close button
function closeBtn(){
  sharescreen.disabled = true;
  sharescreen.value = "0"
  sharescreen.innerHTML = "share screen"
  hidelocalbox.disabled = true
  hidelocalbox.value = "0"
  hidelocalbox.innerHTML = "hide localbox"
  disconnectbtn.disabled = true;
  disconnectbtn.innerHTML = 'wait for connect....';
  var bt = document.getElementsByClassName('remote-video');
  slen = Object.keys(bt).length
  for (i = 0; i < slen-1; i++) {
    bt[1].remove()
  }
};


// uuid function
function UUID() {
  var d = Date.now();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
    //use high-precision timer if available
    d += performance.now();
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}



// used url join room or creat room
// http://localhost:3000/?mode=1&room=500
if(location.href.indexOf('?')!=-1){
  var datalist = location.href.split('?')[1].split('&');
  mode = parseInt(datalist[0].split('=')[1])
  roominput.value = datalist[1].split('=')[1]
  connectbtn.click()
}
