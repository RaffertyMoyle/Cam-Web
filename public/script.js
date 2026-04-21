const socket = io();
const videoGrid = document.getElementById('video-grid');
const joinBtn = document.getElementById('join-btn');
const leaveBtn = document.getElementById('leave-btn');

const roomId = 'main'; // Single room for all
let myPeer;
let myStream;
let peers = {};

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

joinBtn.addEventListener('click', joinChat);
leaveBtn.addEventListener('click', leaveChat);

async function joinChat() {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    addVideoStream(document.createElement('video'), myStream, 'me');

    socket.emit('join-room', roomId);

    joinBtn.style.display = 'none';
    leaveBtn.style.display = 'inline';
  } catch (error) {
    console.error('Error accessing media devices.', error);
    alert('Could not access webcam/microphone. Please allow permissions.');
  }
}

function leaveChat() {
  if (myStream) {
    myStream.getTracks().forEach(track => track.stop());
  }
  videoGrid.innerHTML = '';
  Object.values(peers).forEach(peer => peer.close());
  peers = {};
  socket.disconnect();
  joinBtn.style.display = 'inline';
  leaveBtn.style.display = 'none';
}

function addVideoStream(video, stream, id) {
  video.srcObject = stream;
  video.id = id;
  video.addEventListener('loadedmetadata', () => {
    video.play();
  });
  videoGrid.append(video);
}

socket.on('user-connected', userId => {
  connectToNewUser(userId);
});

socket.on('user-disconnected', userId => {
  if (peers[userId]) {
    peers[userId].close();
    delete peers[userId];
    const video = document.getElementById(userId);
    if (video) video.remove();
  }
});

socket.on('offer', data => {
  const peer = createPeer(data.from);
  peer.setRemoteDescription(new RTCSessionDescription(data.offer));
  peer.createAnswer().then(answer => {
    peer.setLocalDescription(answer);
    socket.emit('answer', { answer, target: data.from });
  });
});

socket.on('answer', data => {
  peers[data.from].setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('ice-candidate', data => {
  peers[data.from].addIceCandidate(new RTCIceCandidate(data.candidate));
});

function connectToNewUser(userId) {
  const peer = createPeer(userId);
  myStream.getTracks().forEach(track => peer.addTrack(track, myStream));
  peer.createOffer().then(offer => {
    peer.setLocalDescription(offer);
    socket.emit('offer', { offer, target: userId });
  });
}

function createPeer(userId) {
  const peer = new RTCPeerConnection(configuration);
  peers[userId] = peer;

  peer.onicecandidate = event => {
    if (event.candidate) {
      socket.emit('ice-candidate', { candidate: event.candidate, target: userId });
    }
  };

  peer.ontrack = event => {
    const video = document.createElement('video');
    addVideoStream(video, event.streams[0], userId);
  };

  return peer;
}