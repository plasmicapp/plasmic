// Copyright (C) 2019, Rory Bradford <roryrjb@gmail.com>
// MIT License

#include <node.h>
#include <seccomp.h>
#include "seccomp.h"

namespace seccomp {

using v8::Local;
using v8::Object;

void wrapError(const v8::FunctionCallbackInfo<v8::Value>& args) {
  int type = args[0].As<v8::Number>()->Value();
  args.GetReturnValue().Set(SCMP_ACT_ERRNO(type));
}

void InitAll(v8::Local<v8::Object> exports) {
  NODE_DEFINE_CONSTANT(exports, SCMP_ACT_ALLOW);
  NODE_DEFINE_CONSTANT(exports, SCMP_ACT_KILL_PROCESS);
  NODE_SET_METHOD(exports, "SCMP_ACT_ERRNO", wrapError);

#ifdef EACCES
    NODE_DEFINE_CONSTANT(exports, EACCES);
#endif

#ifdef EADDRINUSE
    NODE_DEFINE_CONSTANT(exports, EADDRINUSE);
#endif

#ifdef EADDRNOTAVAIL
    NODE_DEFINE_CONSTANT(exports, EADDRNOTAVAIL);
#endif

#ifdef EAFNOSUPPORT
    NODE_DEFINE_CONSTANT(exports, EAFNOSUPPORT);
#endif

#ifdef EAGAIN
    NODE_DEFINE_CONSTANT(exports, EAGAIN);
#endif

#ifdef EWOULDBLOCK
    NODE_DEFINE_CONSTANT(exports, EWOULDBLOCK);
#endif

#ifdef EALREADY
    NODE_DEFINE_CONSTANT(exports, EALREADY);
#endif

#ifdef EBADF
    NODE_DEFINE_CONSTANT(exports, EBADF);
#endif

#ifdef EBADMSG
    NODE_DEFINE_CONSTANT(exports, EBADMSG);
#endif

#ifdef EBUSY
    NODE_DEFINE_CONSTANT(exports, EBUSY);
#endif

#ifdef ECANCELED
    NODE_DEFINE_CONSTANT(exports, ECANCELED);
#endif

#ifdef ECHILD
    NODE_DEFINE_CONSTANT(exports, ECHILD);
#endif

#ifdef ECONNABORTED
    NODE_DEFINE_CONSTANT(exports, ECONNABORTED);
#endif

#ifdef ECONNREFUSED
    NODE_DEFINE_CONSTANT(exports, ECONNREFUSED);
#endif

#ifdef ECONNRESET
    NODE_DEFINE_CONSTANT(exports, ECONNRESET);
#endif

#ifdef EDEADLK
    NODE_DEFINE_CONSTANT(exports, EDEADLK);
#endif

#ifdef EDESTADDRREQ
    NODE_DEFINE_CONSTANT(exports, EDESTADDRREQ);
#endif

#ifdef EDOM
    NODE_DEFINE_CONSTANT(exports, EDOM);
#endif

#ifdef EDQUOT
    NODE_DEFINE_CONSTANT(exports, EDQUOT);
#endif

#ifdef EEXIST
    NODE_DEFINE_CONSTANT(exports, EEXIST);
#endif

#ifdef EFAULT
    NODE_DEFINE_CONSTANT(exports, EFAULT);
#endif

#ifdef EFBIG
    NODE_DEFINE_CONSTANT(exports, EFBIG);
#endif

#ifdef EHOSTUNREACH
    NODE_DEFINE_CONSTANT(exports, EHOSTUNREACH);
#endif

#ifdef EIDRM
    NODE_DEFINE_CONSTANT(exports, EIDRM);
#endif

#ifdef EILSEQ
    NODE_DEFINE_CONSTANT(exports, EILSEQ);
#endif

#ifdef EINPROGRESS
    NODE_DEFINE_CONSTANT(exports, EINPROGRESS);
#endif

#ifdef EINTR
    NODE_DEFINE_CONSTANT(exports, EINTR);
#endif

#ifdef EINVAL
    NODE_DEFINE_CONSTANT(exports, EINVAL);
#endif

#ifdef EIO
    NODE_DEFINE_CONSTANT(exports, EIO);
#endif

#ifdef EISCONN
    NODE_DEFINE_CONSTANT(exports, EISCONN);
#endif

#ifdef EISDIR
    NODE_DEFINE_CONSTANT(exports, EISDIR);
#endif

#ifdef ELOOP
    NODE_DEFINE_CONSTANT(exports, ELOOP);
#endif

#ifdef EMFILE
    NODE_DEFINE_CONSTANT(exports, EMFILE);
#endif

#ifdef EMLINK
    NODE_DEFINE_CONSTANT(exports, EMLINK);
#endif

#ifdef EMSGSIZE
    NODE_DEFINE_CONSTANT(exports, EMSGSIZE);
#endif

#ifdef EMULTIHOP
    NODE_DEFINE_CONSTANT(exports, EMULTIHOP);
#endif

#ifdef ENAMETOOLONG
    NODE_DEFINE_CONSTANT(exports, ENAMETOOLONG);
#endif

#ifdef ENETDOWN
    NODE_DEFINE_CONSTANT(exports, ENETDOWN);
#endif

#ifdef ENETRESET
    NODE_DEFINE_CONSTANT(exports, ENETRESET);
#endif

#ifdef ENETUNREACH
    NODE_DEFINE_CONSTANT(exports, ENETUNREACH);
#endif

#ifdef ENFILE
    NODE_DEFINE_CONSTANT(exports, ENFILE);
#endif

#ifdef ENOBUFS
    NODE_DEFINE_CONSTANT(exports, ENOBUFS);
#endif

#ifdef ENODATA
    NODE_DEFINE_CONSTANT(exports, ENODATA);
#endif

#ifdef ENODEV
    NODE_DEFINE_CONSTANT(exports, ENODEV);
#endif

#ifdef ENOENT
    NODE_DEFINE_CONSTANT(exports, ENOENT);
#endif

#ifdef ENOEXEC
    NODE_DEFINE_CONSTANT(exports, ENOEXEC);
#endif

#ifdef ENOLINK
    NODE_DEFINE_CONSTANT(exports, ENOLINK);
#endif

#ifdef ENOLCK
    NODE_DEFINE_CONSTANT(exports, ENOLCK);
#endif

#ifdef ENOMEM
    NODE_DEFINE_CONSTANT(exports, ENOMEM);
#endif

#ifdef ENOMSG
    NODE_DEFINE_CONSTANT(exports, ENOMSG);
#endif

#ifdef ENOPROTOOPT
    NODE_DEFINE_CONSTANT(exports, ENOPROTOOPT);
#endif

#ifdef ENOSPC
    NODE_DEFINE_CONSTANT(exports, ENOSPC);
#endif

#ifdef ENOSR
    NODE_DEFINE_CONSTANT(exports, ENOSR);
#endif

#ifdef ENOSTR
    NODE_DEFINE_CONSTANT(exports, ENOSTR);
#endif

#ifdef ENOSYS
    NODE_DEFINE_CONSTANT(exports, ENOSYS);
#endif

#ifdef ENOTCONN
    NODE_DEFINE_CONSTANT(exports, ENOTCONN);
#endif

#ifdef ENOTDIR
    NODE_DEFINE_CONSTANT(exports, ENOTDIR);
#endif

#ifdef ENOTEMPTY
    NODE_DEFINE_CONSTANT(exports, ENOTEMPTY);
#endif

#ifdef ENOTSOCK
    NODE_DEFINE_CONSTANT(exports, ENOTSOCK);
#endif

#ifdef ENOTSUP
    NODE_DEFINE_CONSTANT(exports, ENOTSUP);
#else
#ifdef EOPNOTSUPP
    NODE_DEFINE_CONSTANT(exports, EOPNOTSUPP);
#endif
#endif

#ifdef ENOTTY
    NODE_DEFINE_CONSTANT(exports, ENOTTY);
#endif

#ifdef ENXIO
    NODE_DEFINE_CONSTANT(exports, ENXIO);
#endif

#ifdef EOVERFLOW
    NODE_DEFINE_CONSTANT(exports, EOVERFLOW);
#endif

#ifdef EPERM
    NODE_DEFINE_CONSTANT(exports, EPERM);
#endif

#ifdef EPIPE
    NODE_DEFINE_CONSTANT(exports, EPIPE);
#endif

#ifdef EPROTO
    NODE_DEFINE_CONSTANT(exports, EPROTO);
#endif

#ifdef EPROTONOSUPPORT
    NODE_DEFINE_CONSTANT(exports, EPROTONOSUPPORT);
#endif

#ifdef EPROTOTYPE
    NODE_DEFINE_CONSTANT(exports, EPROTOTYPE);
#endif

#ifdef ERANGE
    NODE_DEFINE_CONSTANT(exports, ERANGE);
#endif

#ifdef EROFS
    NODE_DEFINE_CONSTANT(exports, EROFS);
#endif

#ifdef ESPIPE
    NODE_DEFINE_CONSTANT(exports, ESPIPE);
#endif

#ifdef ESRCH
    NODE_DEFINE_CONSTANT(exports, ESRCH);
#endif

#ifdef ESTALE
    NODE_DEFINE_CONSTANT(exports, ESTALE);
#endif

#ifdef ETIME
    NODE_DEFINE_CONSTANT(exports, ETIME);
#endif

#ifdef ETIMEDOUT
    NODE_DEFINE_CONSTANT(exports, ETIMEDOUT);
#endif

#ifdef ETXTBSY
    NODE_DEFINE_CONSTANT(exports, ETXTBSY);
#endif

#ifdef EXDEV
    NODE_DEFINE_CONSTANT(exports, EXDEV);
#endif

  NodeSeccomp::Init(exports);
}

NODE_MODULE(NODE_GYP_MODULE_NAME, InitAll)

}
