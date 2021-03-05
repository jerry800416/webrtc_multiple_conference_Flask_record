# coding=utf-8
from moviepy.editor import VideoFileClip, AudioFileClip, CompositeAudioClip
import subprocess,os,time,datetime



def mergeAudio(path,mp4filelist,ouput,timelist):
    '''
    this function is merge audio.\r\n
    path : room path dir,type(str).\r\n
    mp4filelist : file need to merge in this path,type(list -> str).\r\n
    ouput : output file address,type(str).\r\n
    timelist : delay time list,type(dic -> int).\r\n
    return : True or False,type(bool).
    '''
    try:
        for i in range(len(mp4filelist)):
            try:
                globals()['clip'+str(i)] = VideoFileClip(path+mp4filelist[i]).audio
            except:
                globals()['clip'+str(i)] = AudioFileClip(path+mp4filelist[i])
        new_audioclip = CompositeAudioClip([eval('clip'+str(j)).set_start(timelist[mp4filelist[j].split('.')[0]]).volumex(0.5) for j in range(len(mp4filelist))])

        new_audioclip.write_audiofile(ouput,44100)
    except:
        return False
    return True


def webm2Mp4(file,result):
    '''
    this func is turn webm file to mp4 file used ffmpeg packege.\r\n
    file : need to turn to mp4 file address,type(str).\r\n
    result : output file address,type(str).\r\n
    return : True or False,type(bool).
    '''
    cmd = 'ffmpeg -i {} -c:v copy {}'.format(file,result)
    x = subprocess.call(cmd,shell=True)

    if x == 0 : 
        return True
    else:
        os.remove(result)
        cmd = 'ffmpeg -i {} {}'.format(file,result)
        x = subprocess.call(cmd,shell=True)
        if x == 0 :
            return True
    return False


def go2Log(log_path, e):
    '''
    write info to log.\r\n
    log_path : log file address,type(str).\r\n
    e : error info,type(unknow).
    '''
    time = datetime.datetime.now()
    with open(log_path, 'a', newline='') as f:
        f.write('{} :{}\n'.format(time.strftime("%Y-%m-%d %H:%M:%S"), str(e)))


def flipTime(file,date):
    '''
    check file create time,and mp3 are already in path ,if not filter date ,return False,else return True.\r\n
    file : input file address,type(str).\r\n
    date : filter date,type(str).\r\n
    return : True or False,type(bool).
    '''
    filetime = time.strftime('%Y-%m-%d', time.localtime(os.stat(file).st_ctime))
    # check mp3 already in path or creat room time not yesterday
    alreadymerge = [i.split('.')[1] if i.split('.')[1]== 'mp3' else None for i in os.listdir(file)]
    if date != filetime or 'mp3' in alreadymerge:
        return False
    return True


def readTime(path):
    '''
    read delay time and make dictionary.\r\n
    path : need to read delay time path,type(list -> str).\r\n
    return : {filename:delaytime},type(str:int)
    '''
    timelist = {}
    inputfilelist = []
    filenamelist = os.listdir(path)
    for i in filenamelist:
        if i.split('.')[1] == 'txt':
            with open(path+i,'r',newline=None) as file:
                r = file.readlines()
            sttime =int(r[0].split('\n')[0])
            timelist[i.split('.')[0]] = sttime
        else :
            inputfilelist.append(i)

    minsec = timelist[min(timelist, key=timelist.get)]
    for i in timelist:
        timelist[i] -= minsec
        if timelist[i] == 1:
            timelist[i] = 0
    return timelist,inputfilelist


def splitListDir(path,splitstring,cindex):
    '''
    split string in list filter split string.\r\n
    path : need to listdir path address,type(str).\r\n
    splitstring : filter to split string,type(str).\r\n
    cindex : split with splitstring index,type(int).\r\n
    return : result with split filter string,type(list).
    '''
    results = []
    pathlist = os.listdir(path)
    for i in pathlist:
        if i.split('.')[cindex] == splitstring:
            results.append(i)
    return results



if __name__ == '__main__':

    # recordpath = r"D:\\WebSite\\ITTS-EP-FRONTSITE\\wwwroot\\RecordUpload\\"
    recordpath = "E:\\work\\webrtc\\mutilwebconference0.0.5\\record\\"
    record_list = os.listdir(recordpath)
    yesterday = str(datetime.date.today()-datetime.timedelta(days=0))
    # for each all room
    for i in record_list:
        try:
            # get time delay list and webm file list
            timelist,inputfilelist = readTime(recordpath+i+'\\')
            # check room if creat time is yesterday
            if flipTime(recordpath+i,yesterday) == True:
                filelist = []
                # for each all webm in this room
                for j in inputfilelist:
                    a = j.split('.')[1]
                    if a =='webm':
                        file = recordpath+i+'\\'+ j
                        ouput = file.split('webm')[0]+'mp4'
                        # turn webm to mp4
                        if webm2Mp4(file,ouput) != True :
                            go2Log("./mergelog.log","[webm2mp4ERR] {} ".format(j))
                # get all mp4 file in this dir
                mp4filelist = splitListDir(recordpath+i+'\\','mp4',1)
                result = recordpath+i+'\\{}.mp3'.format(i)
                # merge audio
                if mergeAudio(recordpath+i+'\\',mp4filelist,result,timelist) != True :
                    go2Log("./mergelog.log","[merge failed] {} ".format(i))
            else :
                go2Log("./mergelog.log","[info] no file need to merge today")
        except Exception as e :
            print(e)

    go2Log("./mergelog.log","merge mp3 Done")
