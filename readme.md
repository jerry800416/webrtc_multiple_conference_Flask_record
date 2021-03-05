# webrtc multiple conference Flask with record
<br>
this is webrtc video/audio conference example,used flask Signaling server and add record video/audio function.<br>
warining : recording function can record both clinet video and sound,but merge function only merge audio because video is too resource intensive.<br>
warining : this meeting room that can only accommodate 6 people.<br><br>


1. app.py => server used socketIO to control all clinets<br>
2. index.html => templete html<br>
3. static/client.py => webrtc js for client<br>
4. record folder => record folder<br>
5. mergevideo.py => merge video/audio and catch audio from record folder<br>
6. source folder => ffmpeg folder<br><br>

## base 
1. system : Windows 10 professional<br>
2. Python version : 3.6 <br>
3. chrome version : 87.0.4280.88<br><br>

## how to use
1. cmd : pip install -r requirements.txt<br>
2. unzip ffmpeg-2020-12-20-git-ab6a56773f-full_build.7z and install it on Root directory<br>
3. cmd : python app.py<br>
4. creat a folder in the root directory,folder name: record<br>
5. open browser and enter url: localhost:3000<br>
6. if you want to merge record audio, cmd : python mergevideo.py<br>
7. enjoy it!<br><br>

## history

#### 20210305 update
1. first upload <br><br>