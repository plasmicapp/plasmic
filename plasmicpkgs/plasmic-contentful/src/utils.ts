export const searchParameters = [
    {
        value: "[match]",
        label: 'Full text search  '
    },
    {
        value: "[in]",
        label: 'Inclusion'
    },
    {
        value: "[nin]",
        label: 'Exclusion'
    },

    {
        value: "[lt]",
        label: 'Lesser than'
    }, {
        value: "[lte]",
        label: 'Less Than or Equal'
    },
    {
        value: "[gt]",
        label: 'Greater Than'
    },
    {
        value: "[gte]",
        label: 'Greater Than or Equal '
    },
  

]


export const uniq = <T>(xs: Array<T>): T[] => Array.from(new Set(xs))