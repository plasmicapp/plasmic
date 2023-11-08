#!/bin/sh
echo "fs.inotify.max_user_watches before update"
cat /etc/sysctl.conf | grep fs.inotify
echo "______________________________________________updating inotify ____________________________________"
echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf && sysctl -p
echo "updated value is"
cat /etc/sysctl.conf | grep fs.inotify