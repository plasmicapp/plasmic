FROM ubuntu:20.04

# Config
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install dependencies

# System setup
RUN apt update
RUN apt install -y sudo build-essential python3 python3-pip virtualenvwrapper git wget curl screen postgresql

## Node.js
RUN curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
RUN apt-get install -y nodejs
RUN npm install -g yarn
RUN npm install -g typescript

## pip
RUN pip3 install --upgrade git-review
RUN pip3 install nodeenv
RUN nodeenv -n 14.7.0 /root/.node/14.7.0/

# Entrypoint
RUN echo "#!/bin/sh \n\
echo "fs.inotify.max_user_watches before update" \n\
cat /etc/sysctl.conf | grep fs.inotify \n\
echo "______________________________________________updating inotify ____________________________________" \n\
echo fs.inotify.max_user_watches=524288 | tee -a /etc/sysctl.conf && sysctl -p \n\
echo "updated value is" \n\
cat /etc/sysctl.conf | grep fs.inotify \n\
exec bash \
" >> /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
RUN ln -s `which pip3` /usr/bin/pip

# Secrets config
ADD secrets.json /root/.plasmic/

# Expose server port
EXPOSE 3003

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
