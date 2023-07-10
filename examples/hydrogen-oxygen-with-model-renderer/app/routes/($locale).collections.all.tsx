import {redirect, type LoaderArgs} from '@shopify/remix-oxygen';

export async function loader({params}: LoaderArgs) {
  return redirect(params?.locale ? `${params.locale}/products` : '/products');
}
