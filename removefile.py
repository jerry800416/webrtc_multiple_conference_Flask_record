# coding=utf-8
from mergevideo import splitListDir,go2Log
import os



if __name__ == '__main__':
    

    # remove old mp4 file
    recordpath = "E:\\work\\webrtc\\mutilwebconference0.0.5\\record\\"
    record_list = os.listdir(recordpath)
    for i in record_list: 
        # get all mp4 file in this dir
        mp4filelist = splitListDir(recordpath+i+'\\','mp4',1)
        for j in mp4filelist:
            os.remove(recordpath+i+'\\' + j)
    go2Log("./mergelog.log","remove mp4 file Done")