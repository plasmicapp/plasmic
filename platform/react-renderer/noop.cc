// Copyright (C) 2019, Rory Bradford <roryrjb@gmail.com>
// MIT License

#include <node.h>

namespace seccomp {

void exports(const v8::FunctionCallbackInfo<v8::Value>& args) {}

void Init(v8::Local<v8::Object> exports, v8::Local<v8::Object> module) {
  NODE_SET_METHOD(module, "exports", seccomp::exports);
}

NODE_MODULE(addon, Init)

}
