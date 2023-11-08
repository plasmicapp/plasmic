// Copyright (C) 2019, Rory Bradford <roryrjb@gmail.com>
// MIT License

#ifndef NODE_SECCOMP_H
#define NODE_SECCOMP_H

#include <node.h>
#include <node_object_wrap.h>
#include <seccomp.h>

namespace seccomp {

class NodeSeccomp : public node::ObjectWrap {
 public:
  static void Init(v8::Local<v8::Object> exports);

 private:
  explicit NodeSeccomp(scmp_filter_ctx ctx = nullptr);
  ~NodeSeccomp();

  static void New(const v8::FunctionCallbackInfo<v8::Value>& args);
  static void SeccompLoad(const v8::FunctionCallbackInfo<v8::Value>& args);
  static v8::Persistent<v8::Function> constructor;

  scmp_filter_ctx _ctx;
};

}

#endif
