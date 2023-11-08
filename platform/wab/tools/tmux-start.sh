#!/bin/sh
tmux new-session -d -s development

tmux new-window -t development:1 'bash'
tmux new-window -t development:2 'bash'
tmux new-window -t development:3 'bash'
tmux new-window -t development:4 'bash'
tmux new-window -t development:5 'bash'
tmux new-window -t development:6 'bash'

tmux send-keys -t development:1 'yarn start'
tmux send-keys -t development:2 'yarn ts-watch'
tmux send-keys -t development:3 'yarn backend'
tmux send-keys -t development:4 'yarn host-server'
tmux send-keys -t development:5 'yarn watch-css & cd ../sub/; yarn watch & cd ../live-frame/; yarn watch &'

tmux select-window -t development:1
tmux -2 attach-session -t development
