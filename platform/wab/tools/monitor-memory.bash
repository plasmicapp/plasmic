#!/usr/bin/env bash

while true ; do
  pid=$( pgrep -f tsx )
  if (( $( ps -o %mem $pid | tail -1 | sed -s 's/\..*//' ) >= 50 )) ; then
    echo "node taking >50% mem on prod! Doing yarn pm2 reload backend" | \
      mail -a From:\ Ops\<ubuntu@studio.plasmic.app\> -s "Memory warning" ops@plasmic.app
    yarn pm2 reload backend
  fi
  sleep 300
done
