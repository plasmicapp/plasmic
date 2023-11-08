/*
 * Copyright (c) 2012 The Chromium OS Authors <chromium-os-dev@chromium.org>
 * Authors:
 *  Will Drewry <wad@chromium.org>
 *  Kees Cook <keescook@chromium.org>
 *
 * The code may be used by anyone for any purpose, and can serve as a
 * starting point for developing applications using mode 2 seccomp.
 */
#include "seccomp.h"

// #define REPORT_SYSCALLS 1

#define _GNU_SOURCE 1
#include <stdio.h>
#include <stddef.h>
#include <stdlib.h>
#include <unistd.h>

//

#include "config.h"
#include "seccomp-bpf.h"



#ifdef REPORT_SYSCALLS

#include "syscall-reporter.h"
#include "syscall-names.h"

const char * const msg_needed = "Looks like you also need syscall: ";

/* Since "sprintf" is technically not signal-safe, reimplement %d here. */
static void write_uint(char *buf, unsigned int val)
{
	int width = 0;
	unsigned int tens;

	if (val == 0) {
		strcpy(buf, "0");
		return;
	}
	for (tens = val; tens; tens /= 10)
		++ width;
	buf[width] = '\0';
	for (tens = val; tens; tens /= 10)
		buf[--width] = '0' + (tens % 10);
}

static void reporter(int nr, siginfo_t *info, void *void_context)
{
	char buf[128];
	ucontext_t *ctx = (ucontext_t *)(void_context);
	unsigned int syscall;
	if (info->si_code != SYS_SECCOMP)
		return;
	if (!ctx)
		return;
	syscall = ctx->uc_mcontext.gregs[REG_SYSCALL];
	strcpy(buf, msg_needed);
	if (syscall < sizeof(syscall_names)) {
		strcat(buf, syscall_names[syscall]);
		strcat(buf, "(");
	}
	write_uint(buf + strlen(buf), syscall);
	if (syscall < sizeof(syscall_names))
		strcat(buf, ")");
	strcat(buf, "\n");
	write(STDOUT_FILENO, buf, strlen(buf));
	_exit(1);
}

int install_syscall_reporter(void)
{
	struct sigaction act;
	sigset_t mask;
	memset(&act, 0, sizeof(act));
	sigemptyset(&mask);
	sigaddset(&mask, SIGSYS);

	act.sa_sigaction = &reporter;
	act.sa_flags = SA_SIGINFO;
	if (sigaction(SIGSYS, &act, NULL) < 0) {
		perror("sigaction");
		return -1;
	}
	if (sigprocmask(SIG_UNBLOCK, &mask, NULL)) {
		perror("sigprocmask");
		return -1;
	}
	return 0;
}

#endif // REPORT_SYSCALLS



static int install_syscall_filter(void)
{
	struct sock_filter filter[] = {
		/* Validate architecture. */
		VALIDATE_ARCHITECTURE,
		/* Grab the system call number. */
		EXAMINE_SYSCALL,
		/* List allowed syscalls. */
		ALLOW_SYSCALL(rt_sigreturn),
#ifdef __NR_sigreturn
		ALLOW_SYSCALL(sigreturn),
#endif
		ALLOW_SYSCALL(exit),
        ALLOW_SYSCALL(brk),
        ALLOW_SYSCALL(clone),
        ALLOW_SYSCALL(close),
        ALLOW_SYSCALL(connect),
        ALLOW_SYSCALL(epoll_ctl),
        ALLOW_SYSCALL(epoll_pwait),
        ALLOW_SYSCALL(exit_group),
        ALLOW_SYSCALL(fcntl),
        ALLOW_SYSCALL(fstat),
        ALLOW_SYSCALL(futex),
        ALLOW_SYSCALL(getpid),
        ALLOW_SYSCALL(getsockopt),
        ALLOW_SYSCALL(ioctl),
        ALLOW_SYSCALL(madvise),
        ALLOW_SYSCALL(mmap),
        ALLOW_SYSCALL(mprotect),
        ALLOW_SYSCALL(munmap),
        ALLOW_SYSCALL(open),
        ALLOW_SYSCALL(prlimit64),
        ALLOW_SYSCALL(read),
        ALLOW_SYSCALL(rt_sigaction),
        ALLOW_SYSCALL(rt_sigprocmask),
        ALLOW_SYSCALL(setsockopt),
        ALLOW_SYSCALL(socket),
        ALLOW_SYSCALL(write),

        ALLOW_SYSCALL(poll),
        ALLOW_SYSCALL(bind),
        ALLOW_SYSCALL(sendto),
        ALLOW_SYSCALL(recvfrom),

		/* Add more syscalls here. */
		KILL_PROCESS,
	};
	struct sock_fprog prog = {
		.len = (unsigned short)(sizeof(filter)/sizeof(filter[0])),
		.filter = filter,
	};

	if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)) {
		perror("prctl(NO_NEW_PRIVS)");
		goto failed;
	}
	if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog)) {
		perror("prctl(SECCOMP)");
		goto failed;
	}
	return 0;

failed:
	if (errno == EINVAL)
		fprintf(stderr, "SECCOMP_FILTER is not available. :(\n");
	return 1;
}

int setup()
{
#ifdef REPORT_SYSCALLS
	if (install_syscall_reporter())
		return 1;
#endif
	if (install_syscall_filter())
		return 1;

	return 0;
}




namespace seccomp {

using v8::Context;
using v8::Function;
using v8::FunctionCallbackInfo;
using v8::FunctionTemplate;
using v8::Isolate;
using v8::Local;
using v8::NewStringType;
using v8::Number;
using v8::Object;
using v8::Persistent;
using v8::String;
using v8::Value;

const char* ToCString(const v8::String::Utf8Value& value) {
  return *value;
}

Persistent<Function> NodeSeccomp::constructor;

NodeSeccomp::NodeSeccomp(scmp_filter_ctx ctx) : _ctx(ctx) {
}

NodeSeccomp::~NodeSeccomp() {
  seccomp_release(_ctx);
}

void NodeSeccomp::Init(Local<Object> exports) {
  Isolate* isolate = exports->GetIsolate();

  Local<FunctionTemplate> tpl = FunctionTemplate::New(isolate, New);
  tpl->SetClassName(String::NewFromUtf8(
      isolate, "NodeSeccomp", NewStringType::kNormal).ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  NODE_SET_PROTOTYPE_METHOD(tpl, "load", SeccompLoad);

  Local<Context> context = isolate->GetCurrentContext();
  constructor.Reset(isolate, tpl->GetFunction(context).ToLocalChecked());
  exports->Set(context, String::NewFromUtf8(
      isolate, "NodeSeccomp", NewStringType::kNormal).ToLocalChecked(),
               tpl->GetFunction(context).ToLocalChecked()).FromJust();
}

void NodeSeccomp::New(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Local<Context> context = isolate->GetCurrentContext();
  scmp_filter_ctx ctx;

  if (args.IsConstructCall()) {
    NodeSeccomp* obj = new NodeSeccomp(ctx);
    obj->Wrap(args.This());
    args.GetReturnValue().Set(args.This());
  } else {
    Local<Function> cons = Local<Function>::New(isolate, constructor);
    Local<Object> instance =
        cons->NewInstance(context).ToLocalChecked();
    args.GetReturnValue().Set(instance);
  }
}

void NodeSeccomp::SeccompLoad(const v8::FunctionCallbackInfo<v8::Value>& args) {
  NodeSeccomp* obj = ObjectWrap::Unwrap<NodeSeccomp>(args.Holder());
  setup();
}

}  // namespace seccomp
