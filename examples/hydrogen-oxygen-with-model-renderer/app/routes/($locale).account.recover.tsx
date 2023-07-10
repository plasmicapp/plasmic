import {
  json,
  redirect,
  type ActionFunction,
  type LoaderArgs,
} from '@shopify/remix-oxygen';
import {Form, useActionData, type V2_MetaFunction} from '@remix-run/react';
import {useState} from 'react';

import {Link} from '~/components';
import {getInputStyleClasses} from '~/lib/utils';

export async function loader({context, params}: LoaderArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');

  if (customerAccessToken) {
    return redirect(params.locale ? `${params.locale}/account` : '/account');
  }

  return new Response(null);
}

type ActionData = {
  formError?: string;
  resetRequested?: boolean;
};

const badRequest = (data: ActionData) => json(data, {status: 400});

export const action: ActionFunction = async ({request, context}) => {
  const formData = await request.formData();
  const email = formData.get('email');

  if (!email || typeof email !== 'string') {
    return badRequest({
      formError: 'Please provide an email.',
    });
  }

  try {
    await context.storefront.mutate(CUSTOMER_RECOVER_MUTATION, {
      variables: {email},
    });

    return json({resetRequested: true});
  } catch (error: any) {
    return badRequest({
      formError: 'Something went wrong. Please try again later.',
    });
  }
};

export const meta: V2_MetaFunction = () => {
  return [{title: 'Recover Password'}];
};

export default function Recover() {
  const actionData = useActionData<ActionData>();
  const [nativeEmailError, setNativeEmailError] = useState<null | string>(null);
  const isSubmitted = actionData?.resetRequested;

  return (
    <div className="flex justify-center my-24 px-4">
      <div className="max-w-md w-full">
        {isSubmitted ? (
          <>
            <h1 className="text-4xl">Request Sent.</h1>
            <p className="mt-4">
              If that email address is in our system, you will receive an email
              with instructions about how to reset your password in a few
              minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl">Forgot Password.</h1>
            <p className="mt-4">
              Enter the email address associated with your account to receive a
              link to reset your password.
            </p>
            {/* TODO: Add onSubmit to validate _before_ submission with native? */}
            <Form
              method="post"
              noValidate
              className="pt-6 pb-8 mt-4 mb-4 space-y-3"
            >
              {actionData?.formError && (
                <div className="flex items-center justify-center mb-6 bg-zinc-500">
                  <p className="m-4 text-s text-contrast">
                    {actionData.formError}
                  </p>
                </div>
              )}
              <div>
                <input
                  className={`mb-1 ${getInputStyleClasses(nativeEmailError)}`}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="Email address"
                  aria-label="Email address"
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  onBlur={(event) => {
                    setNativeEmailError(
                      event.currentTarget.value.length &&
                        !event.currentTarget.validity.valid
                        ? 'Invalid email address'
                        : null,
                    );
                  }}
                />
                {nativeEmailError && (
                  <p className="text-red-500 text-xs">
                    {nativeEmailError} &nbsp;
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <button
                  className="bg-primary text-contrast rounded py-2 px-4 focus:shadow-outline block w-full"
                  type="submit"
                >
                  Request Reset Link
                </button>
              </div>
              <div className="flex items-center mt-8 border-t border-gray-300">
                <p className="align-baseline text-sm mt-6">
                  Return to &nbsp;
                  <Link className="inline underline" to="/account/login">
                    Login
                  </Link>
                </p>
              </div>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}

const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
