import { createSupabaseClient } from '../util/supabase/static-props';
import * as fs from 'fs';

async function fetchSchema() {
    const supabase = createSupabaseClient();

    try {
        const { data, error } = await supabase.rpc('get_table_info' as never);
        if (error) {
            throw error;
        }
        fs.writeFileSync('databaseSchema.json', JSON.stringify(data, null, 2));
        console.log('Schema fetched and saved to databaseSchema.json');
    } catch (error: any) {
        console.error('Error fetching schema:', error.message);
    }
}

fetchSchema();