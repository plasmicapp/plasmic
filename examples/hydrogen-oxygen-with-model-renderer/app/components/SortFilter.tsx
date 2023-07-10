import type {SyntheticEvent} from 'react';
import {useMemo, useState} from 'react';
import {Menu} from '@headlessui/react';
import type {Location} from '@remix-run/react';
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import {useDebounce} from 'react-use';
import {Disclosure} from '@headlessui/react';
import type {
  FilterType,
  Filter,
  Collection,
} from '@shopify/hydrogen/storefront-api-types';

import {Heading, IconFilters, IconCaret, IconXMark, Text} from '~/components';

export type AppliedFilter = {
  label: string;
  urlParam: {
    key: string;
    value: string;
  };
};

export type SortParam =
  | 'price-low-high'
  | 'price-high-low'
  | 'best-selling'
  | 'newest'
  | 'featured';

type Props = {
  filters: Filter[];
  appliedFilters?: AppliedFilter[];
  children: React.ReactNode;
  collections?: Array<{handle: string; title: string}>;
};

export function SortFilter({
  filters,
  appliedFilters = [],
  children,
  collections = [],
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <div className="flex items-center justify-between w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={
            'relative flex items-center justify-center w-8 h-8 focus:ring-primary/5'
          }
        >
          <IconFilters />
        </button>
        <SortMenu />
      </div>
      <div className="flex flex-col flex-wrap md:flex-row">
        <div
          className={`transition-all duration-200 ${
            isOpen
              ? 'opacity-100 min-w-full md:min-w-[240px] md:w-[240px] md:pr-8 max-h-full'
              : 'opacity-0 md:min-w-[0px] md:w-[0px] pr-0 max-h-0 md:max-h-full'
          }`}
        >
          <FiltersDrawer
            collections={collections}
            filters={filters}
            appliedFilters={appliedFilters}
          />
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </>
  );
}

export function FiltersDrawer({
  filters = [],
  appliedFilters = [],
  collections = [],
}: Omit<Props, 'children'>) {
  const [params] = useSearchParams();
  const location = useLocation();

  const filterMarkup = (filter: Filter, option: Filter['values'][0]) => {
    switch (filter.type) {
      case 'PRICE_RANGE':
        const min =
          params.has('minPrice') && !isNaN(Number(params.get('minPrice')))
            ? Number(params.get('minPrice'))
            : undefined;

        const max =
          params.has('maxPrice') && !isNaN(Number(params.get('maxPrice')))
            ? Number(params.get('maxPrice'))
            : undefined;

        return <PriceRangeFilter min={min} max={max} />;

      default:
        const to = getFilterLink(
          filter,
          option.input as string,
          params,
          location,
        );
        return (
          <Link
            className="focus:underline hover:underline"
            prefetch="intent"
            to={to}
          >
            {option.label}
          </Link>
        );
    }
  };

  const collectionsMarkup = collections.map((collection) => {
    return (
      <li key={collection.handle} className="pb-4">
        <Link
          to={`/collections/${collection.handle}`}
          className="focus:underline hover:underline"
          key={collection.handle}
          prefetch="intent"
        >
          {collection.title}
        </Link>
      </li>
    );
  });

  return (
    <>
      <nav className="py-8">
        {appliedFilters.length > 0 ? (
          <div className="pb-8">
            <AppliedFilters filters={appliedFilters} />
          </div>
        ) : null}

        <Heading as="h4" size="lead" className="pb-4">
          Filter By
        </Heading>
        <div className="divide-y">
          {filters.map(
            (filter: Filter) =>
              filter.values.length > 1 && (
                <Disclosure as="div" key={filter.id} className="w-full">
                  {({open}) => (
                    <>
                      <Disclosure.Button className="flex justify-between w-full py-4">
                        <Text size="lead">{filter.label}</Text>
                        <IconCaret direction={open ? 'up' : 'down'} />
                      </Disclosure.Button>
                      <Disclosure.Panel key={filter.id}>
                        <ul key={filter.id} className="py-2">
                          {filter.values?.map((option) => {
                            return (
                              <li key={option.id} className="pb-4">
                                {filterMarkup(filter, option)}
                              </li>
                            );
                          })}
                        </ul>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              ),
          )}
        </div>
      </nav>
    </>
  );
}

function AppliedFilters({filters = []}: {filters: AppliedFilter[]}) {
  const [params] = useSearchParams();
  const location = useLocation();
  return (
    <>
      <Heading as="h4" size="lead" className="pb-4">
        Applied filters
      </Heading>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter: AppliedFilter) => {
          return (
            <Link
              to={getAppliedFilterLink(filter, params, location)}
              className="flex px-2 border rounded-full gap"
              key={`${filter.label}-${filter.urlParam}`}
            >
              <span className="flex-grow">{filter.label}</span>
              <span>
                <IconXMark />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function getAppliedFilterLink(
  filter: AppliedFilter,
  params: URLSearchParams,
  location: Location,
) {
  const paramsClone = new URLSearchParams(params);
  if (filter.urlParam.key === 'variantOption') {
    const variantOptions = paramsClone.getAll('variantOption');
    const filteredVariantOptions = variantOptions.filter(
      (options) => !options.includes(filter.urlParam.value),
    );
    paramsClone.delete(filter.urlParam.key);
    for (const filteredVariantOption of filteredVariantOptions) {
      paramsClone.append(filter.urlParam.key, filteredVariantOption);
    }
  } else {
    paramsClone.delete(filter.urlParam.key);
  }
  return `${location.pathname}?${paramsClone.toString()}`;
}

function getSortLink(
  sort: SortParam,
  params: URLSearchParams,
  location: Location,
) {
  params.set('sort', sort);
  return `${location.pathname}?${params.toString()}`;
}

function getFilterLink(
  filter: Filter,
  rawInput: string | Record<string, any>,
  params: URLSearchParams,
  location: ReturnType<typeof useLocation>,
) {
  const paramsClone = new URLSearchParams(params);
  const newParams = filterInputToParams(filter.type, rawInput, paramsClone);
  return `${location.pathname}?${newParams.toString()}`;
}

const PRICE_RANGE_FILTER_DEBOUNCE = 500;

function PriceRangeFilter({max, min}: {max?: number; min?: number}) {
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const navigate = useNavigate();

  const [minPrice, setMinPrice] = useState(min ? String(min) : '');
  const [maxPrice, setMaxPrice] = useState(max ? String(max) : '');

  useDebounce(
    () => {
      if (
        (minPrice === '' || minPrice === String(min)) &&
        (maxPrice === '' || maxPrice === String(max))
      )
        return;

      const price: {min?: string; max?: string} = {};
      if (minPrice !== '') price.min = minPrice;
      if (maxPrice !== '') price.max = maxPrice;

      const newParams = filterInputToParams('PRICE_RANGE', {price}, params);
      navigate(`${location.pathname}?${newParams.toString()}`);
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event: SyntheticEvent) => {
    const newMaxPrice = (event.target as HTMLInputElement).value;
    setMaxPrice(newMaxPrice);
  };

  const onChangeMin = (event: SyntheticEvent) => {
    const newMinPrice = (event.target as HTMLInputElement).value;
    setMinPrice(newMinPrice);
  };

  return (
    <div className="flex flex-col">
      <label className="mb-4">
        <span>from</span>
        <input
          name="maxPrice"
          className="text-black"
          type="text"
          defaultValue={min}
          placeholder={'$'}
          onChange={onChangeMin}
        />
      </label>
      <label>
        <span>to</span>
        <input
          name="minPrice"
          className="text-black"
          type="number"
          defaultValue={max}
          placeholder={'$'}
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

function filterInputToParams(
  type: FilterType,
  rawInput: string | Record<string, any>,
  params: URLSearchParams,
) {
  const input = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  switch (type) {
    case 'PRICE_RANGE':
      if (input.price.min) params.set('minPrice', input.price.min);
      if (input.price.max) params.set('maxPrice', input.price.max);
      break;
    case 'LIST':
      Object.entries(input).forEach(([key, value]) => {
        if (typeof value === 'string') {
          params.set(key, value);
        } else if (typeof value === 'boolean') {
          params.set(key, value.toString());
        } else {
          const {name, value: val} = value as {name: string; value: string};
          const allVariants = params.getAll(`variantOption`);
          const newVariant = `${name}:${val}`;
          if (!allVariants.includes(newVariant)) {
            params.append('variantOption', newVariant);
          }
        }
      });
      break;
  }

  return params;
}

export default function SortMenu() {
  const items: {label: string; key: SortParam}[] = [
    {label: 'Featured', key: 'featured'},
    {
      label: 'Price: Low - High',
      key: 'price-low-high',
    },
    {
      label: 'Price: High - Low',
      key: 'price-high-low',
    },
    {
      label: 'Best Selling',
      key: 'best-selling',
    },
    {
      label: 'Newest',
      key: 'newest',
    },
  ];
  const [params] = useSearchParams();
  const location = useLocation();
  const activeItem = items.find((item) => item.key === params.get('sort'));

  return (
    <Menu as="div" className="relative z-40">
      <Menu.Button className="flex items-center">
        <span className="px-2">
          <span className="px-2 font-medium">Sort by:</span>
          <span>{(activeItem || items[0]).label}</span>
        </span>
        <IconCaret />
      </Menu.Button>

      <Menu.Items
        as="nav"
        className="absolute right-0 flex flex-col p-4 text-right rounded-sm bg-contrast"
      >
        {items.map((item) => (
          <Menu.Item key={item.label}>
            {() => (
              <Link
                className={`block text-sm pb-2 px-3 ${
                  activeItem?.key === item.key ? 'font-bold' : 'font-normal'
                }`}
                to={getSortLink(item.key, params, location)}
              >
                {item.label}
              </Link>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}
