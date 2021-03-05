# coding=utf-8
from flask import Flask, render_template,request
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room
from datetime import datetime
import os,time,json


app = Flask(__name__, template_folder='E:\work\webrtc\mutilwebconference0.0.5\\')
app.config["DEBUG"] = True
# app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app,cors_allowed_origins='*')
db = {}

@app.route('/')
def index():
    return render_template('./index.html')


@socketio.on('join')
def creatOrJoin(roomid):
    # print('\n'.join(['%s:%s' % item for item in socketio.__dict__.items()]))
    try:
    # catch people num in the room ,if  room not be created ,set num = 0
        how_many_people = len(socketio.sockio_mw.engineio_app.manager.rooms['/'][str(roomid)])
    except :
        how_many_people = 0
    
    # detec how many people in room ,if no person ,creat room
    if how_many_people == 0 :
        join_room(room=roomid)
        emit('room_created',room=request.sid)

    # if one person in the room ,join room
    elif how_many_people == 1:
        join_room(room=roomid)
        for i in socketio.sockio_mw.engineio_app.manager.rooms['/'][str(roomid)]:
            if i != request.sid:
                db[roomid] = [{'F':request.sid,'T':i,'room':i}]  
        emit('room_joined',room=request.sid)

    # if 2-4 people in the room ,for each send start call
    elif how_many_people <= 5:
        join_room(room=roomid)
        last = 0
        for i in socketio.sockio_mw.engineio_app.manager.rooms['/'][str(roomid)]:
            if i != request.sid:
                db[roomid].append({'F':i,'T':request.sid,'room':request.sid})
        emit('room_joined',room=request.sid)

    # if 6 people in the room ,return full room info
    else :
        emit('full_room',roomid,room=request.sid)


@socketio.on('start_call')
def startCall(roomid):
    try:
        result = db[roomid].pop(0)
        if len(db) == 0 or len(db[roomid]) == 0:
            emit('start_call',{'F':result['F'],'T':result['T'],'lastconnect':True},room=result['room'])
        else :
            emit('start_call',{'F':result['F'],'T':result['T'],'lastconnect':False},room=result['room'])
    except:
        pass


@socketio.on('webrtc_offer')
def webrtcOffer(event):
    emit('webrtc_offer',{'sdp':event['sdp'],'peerid':event['peerid'],'F':event['F'],'T':event['T']},room=event['T'])


@socketio.on('webrtc_answer')
def webrtcAnswer(event):
    # print('webrtc_answer event to peers in room {}'.format(event['roomid']))
    emit('webrtc_answer',{'sdp':event['sdp'],'peerid':event['peerid'],'F':event['F'],'T':event['T']},room=event['T'])


@socketio.on('webrtc_ice_candidate')
def webrtcIceCandidate(event):
    print(event)
    # print('webrtc_ice_candidate event to peers in room {}'.format(event['roomid']))
    emit('webrtc_ice_candidate',event,room=event['T'])


@socketio.on('upload_blob')
def webrtcuploadblob(event):
    roomid = event['roomid']
    clientid = event['clientid']
    if roomid not in os.listdir('./record/'):
        os.mkdir('./record/{}'.format(roomid))

    with open('./record/{}/{}.webm'.format(roomid,clientid),'ab') as f:
        if event['data'] != [0]:
            f.write(event['data'])

    if event['mode'] == 0:
        emit('transfer_complete')


@socketio.on('record_time')
def recordTime(event):
    if event['roomid'] not in os.listdir('./record/'):
        os.mkdir('./record/{}'.format(event['roomid']))

    file = './record/{}/{}.txt'.format(event['roomid'],event['clientid'])
    with open(file,'a',encoding='utf-8') as file:
        # file.writelines(str({'roomid':event['roomid'],'clientid':event['clientid'],'mode':event['mode'],'time':int(time.time())})
        file.writelines(str(int(time.time()))+'\n')


@socketio.on('leave')
def leaveRoom(event):
    try:
        how_many_people = len(socketio.sockio_mw.engineio_app.manager.rooms['/'][str(event['room'])])
    except:
        how_many_people = 1
    if 1 < how_many_people <= 5 :
        for i in socketio.sockio_mw.engineio_app.manager.rooms['/'][str(event['room'])]:
            if i != event['client']:
                emit('leave_room',{'F':event['client'],'T':i},room=i)
        leave_room(event['room'])
    else:
        emit('close_room',{'F':event['client'],'T':'all'},room=event['client'])
        leave_room(event['room'])
        close_room(event['room'])


if __name__ == '__main__':
    socketio.run(app, debug=True, host='127.0.0.1', port=3000)
