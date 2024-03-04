describe-instance-by-name() {
  local name="$1"
  aws ec2 describe-instances --filters "Name=tag:Name,Values=$name" --output text --query 'Reservations[*].Instances[*].{a:InstanceId,b:PrivateIpAddress}'
}

mssh-by-name() {
  local name="$1" ip id
  local user="${2:-ubuntu}"
  read id ip <<<"$(describe-instance-by-name "$name")"
  mssh "$user@$ip" -t "$id"
}

mssh-discourse() {
  mssh-by-name discourse-server $1
}

mssh-discourse-test() {
  mssh-by-name discourse-test-server $1
}

mssh-gerrit() {
  mssh-by-name gerrit-server
}

# Not yet behind VPN.
mssh-prod() {
  mssh ubuntu@i-0623a5e1bb61dd97b
}

prep-ssh-by-name() {
  local name="$1" ip id
  read id ip <<<"$(describe-instance-by-name "$name")"
  aws ec2-instance-connect send-ssh-public-key \
    --instance-id "$id" \
    --instance-os-user ubuntu \
    --ssh-public-key file://$HOME/.ssh/id_rsa.pub
}
