import {json, redirect, type ActionFunction} from '@shopify/remix-oxygen';
import {
  useActionData,
  Form,
  useOutletContext,
  useNavigation,
} from '@remix-run/react';
import type {
  Customer,
  CustomerUpdateInput,
} from '@shopify/hydrogen/storefront-api-types';
import clsx from 'clsx';
import invariant from 'tiny-invariant';

import {Button, Text} from '~/components';
import {getInputStyleClasses, assertApiErrors} from '~/lib/utils';

import {getCustomer} from './($locale).account';

export interface AccountOutletContext {
  customer: Customer;
}

export interface ActionData {
  success?: boolean;
  formError?: string;
  fieldErrors?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    newPassword2?: string;
  };
}

const badRequest = (data: ActionData) => json(data, {status: 400});

const formDataHas = (formData: FormData, key: string) => {
  if (!formData.has(key)) return false;

  const value = formData.get(key);
  return typeof value === 'string' && value.length > 0;
};

export const handle = {
  renderInModal: true,
};

export const action: ActionFunction = async ({request, context, params}) => {
  const formData = await request.formData();

  const customerAccessToken = await context.session.get('customerAccessToken');

  invariant(
    customerAccessToken,
    'You must be logged in to update your account details.',
  );

  // Double-check current user is logged in.
  // Will throw a logout redirect if not.
  await getCustomer(context, customerAccessToken);

  if (
    formDataHas(formData, 'newPassword') &&
    !formDataHas(formData, 'currentPassword')
  ) {
    return badRequest({
      fieldErrors: {
        currentPassword:
          'Please enter your current password before entering a new password.',
      },
    });
  }

  if (
    formData.has('newPassword') &&
    formData.get('newPassword') !== formData.get('newPassword2')
  ) {
    return badRequest({
      fieldErrors: {
        newPassword2: 'New passwords must match.',
      },
    });
  }

  try {
    const customer: CustomerUpdateInput = {};

    formDataHas(formData, 'firstName') &&
      (customer.firstName = formData.get('firstName') as string);
    formDataHas(formData, 'lastName') &&
      (customer.lastName = formData.get('lastName') as string);
    formDataHas(formData, 'email') &&
      (customer.email = formData.get('email') as string);
    formDataHas(formData, 'phone') &&
      (customer.phone = formData.get('phone') as string);
    formDataHas(formData, 'newPassword') &&
      (customer.password = formData.get('newPassword') as string);

    const data = await context.storefront.mutate(CUSTOMER_UPDATE_MUTATION, {
      variables: {
        customerAccessToken,
        customer,
      },
    });

    assertApiErrors(data.customerUpdate);

    return redirect(params?.locale ? `${params.locale}/account` : '/account');
  } catch (error: any) {
    return badRequest({formError: error.message});
  }
};

/**
 * Since this component is nested in `accounts/`, it is rendered in a modal via `<Outlet>` in `account.tsx`.
 *
 * This allows us to:
 * - preserve URL state (`/accounts/edit` when the modal is open)
 * - co-locate the edit action with the edit form (rather than grouped in account.tsx)
 * - use the `useOutletContext` hook to access the customer data from the parent route (no additional data loading)
 * - return a simple `redirect()` from this action to close the modal :mindblown: (no useState/useEffect)
 * - use the presence of outlet data (in `account.tsx`) to open/close the modal (no useState)
 */
export default function AccountDetailsEdit() {
  const actionData = useActionData<ActionData>();
  const {customer} = useOutletContext<AccountOutletContext>();
  const {state} = useNavigation();

  return (
    <>
      <Text className="mt-4 mb-6" as="h3" size="lead">
        Update your profile
      </Text>
      <Form method="post">
        {actionData?.formError && (
          <div className="flex items-center justify-center mb-6 bg-red-100 rounded">
            <p className="m-4 text-sm text-red-900">{actionData.formError}</p>
          </div>
        )}
        <div className="mt-3">
          <input
            className={getInputStyleClasses()}
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="First name"
            aria-label="First name"
            defaultValue={customer.firstName ?? ''}
          />
        </div>
        <div className="mt-3">
          <input
            className={getInputStyleClasses()}
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Last name"
            aria-label="Last name"
            defaultValue={customer.lastName ?? ''}
          />
        </div>
        <div className="mt-3">
          <input
            className={getInputStyleClasses()}
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Mobile"
            aria-label="Mobile"
            defaultValue={customer.phone ?? ''}
          />
        </div>
        <div className="mt-3">
          <input
            className={getInputStyleClasses(actionData?.fieldErrors?.email)}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            defaultValue={customer.email ?? ''}
          />
          {actionData?.fieldErrors?.email && (
            <p className="text-red-500 text-xs">
              {actionData.fieldErrors.email} &nbsp;
            </p>
          )}
        </div>
        <Text className="mb-6 mt-6" as="h3" size="lead">
          Change your password
        </Text>
        <Password
          name="currentPassword"
          label="Current password"
          passwordError={actionData?.fieldErrors?.currentPassword}
        />
        {actionData?.fieldErrors?.currentPassword && (
          <Text size="fine" className="mt-1 text-red-500">
            {actionData.fieldErrors.currentPassword} &nbsp;
          </Text>
        )}
        <Password
          name="newPassword"
          label="New password"
          passwordError={actionData?.fieldErrors?.newPassword}
        />
        <Password
          name="newPassword2"
          label="Re-enter new password"
          passwordError={actionData?.fieldErrors?.newPassword2}
        />
        <Text
          size="fine"
          color="subtle"
          className={clsx(
            'mt-1',
            actionData?.fieldErrors?.newPassword && 'text-red-500',
          )}
        >
          Passwords must be at least 8 characters.
        </Text>
        {actionData?.fieldErrors?.newPassword2 ? <br /> : null}
        {actionData?.fieldErrors?.newPassword2 && (
          <Text size="fine" className="mt-1 text-red-500">
            {actionData.fieldErrors.newPassword2} &nbsp;
          </Text>
        )}
        <div className="mt-6">
          <Button
            className="text-sm mb-2"
            variant="primary"
            width="full"
            type="submit"
            disabled={state !== 'idle'}
          >
            {state !== 'idle' ? 'Saving' : 'Save'}
          </Button>
        </div>
        <div className="mb-4">
          <Button to=".." className="text-sm" variant="secondary" width="full">
            Cancel
          </Button>
        </div>
      </Form>
    </>
  );
}

function Password({
  name,
  passwordError,
  label,
}: {
  name: string;
  passwordError?: string;
  label: string;
}) {
  return (
    <div className="mt-3">
      <input
        className={getInputStyleClasses(passwordError)}
        id={name}
        name={name}
        type="password"
        autoComplete={
          name === 'currentPassword' ? 'current-password' : undefined
        }
        placeholder={label}
        aria-label={label}
        minLength={8}
      />
    </div>
  );
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
  `;
