import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionRow {
  text: string;
  category: string;
  correct_answer: string;
  options: { a: string; b: string; c: string; d: string };
  source_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get wallet from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string || 'csv';
    const walletAddress = formData.get('wallet_address') as string;

    if (!walletAddress) {
      throw new Error('Wallet address required');
    }

    // Check admin status
    const { data: isAdminData, error: adminError } = await supabase.rpc('is_wallet_admin', {
      wallet_addr: walletAddress
    });

    if (adminError || !isAdminData) {
      console.error('Admin check failed:', adminError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!file) {
      throw new Error('No file provided');
    }

    const content = await file.text();
    const questions: QuestionRow[] = [];
    const errors: string[] = [];

    if (format === 'csv') {
      // Parse CSV: text,category,correct,option_a,option_b,option_c,option_d,source_url
      const lines = content.trim().split('\n');
      
      for (let i = 0; i < lines.length && i < 200; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted fields
        const fields: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim());

        if (fields.length < 7) {
          errors.push(`Row ${i + 1}: Expected 7+ fields, got ${fields.length}`);
          continue;
        }

        const [text, category, correct, a, b, c, d, source_url = ''] = fields;

        // Validate
        if (!text || text.length < 10) {
          errors.push(`Row ${i + 1}: Question text too short`);
          continue;
        }

        if (!['ct', 'web3', 'news'].includes(category.toLowerCase())) {
          errors.push(`Row ${i + 1}: Invalid category "${category}" (use: ct, web3, news)`);
          continue;
        }

        if (!['a', 'b', 'c', 'd'].includes(correct.toLowerCase())) {
          errors.push(`Row ${i + 1}: Correct answer must be a, b, c, or d`);
          continue;
        }

        if (!a || !b || !c || !d) {
          errors.push(`Row ${i + 1}: All 4 options required`);
          continue;
        }

        questions.push({
          text: text.replace(/^"|"$/g, ''),
          category: category.toLowerCase() as 'ct' | 'web3' | 'news',
          correct_answer: correct.toLowerCase(),
          options: { 
            a: a.replace(/^"|"$/g, ''), 
            b: b.replace(/^"|"$/g, ''), 
            c: c.replace(/^"|"$/g, ''), 
            d: d.replace(/^"|"$/g, '') 
          },
          source_url: source_url.replace(/^"|"$/g, '') || undefined,
        });
      }
    } else if (format === 'json') {
      // Parse JSON array
      const parsed = JSON.parse(content);
      
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array');
      }

      for (let i = 0; i < parsed.length && i < 200; i++) {
        const item = parsed[i];

        if (!item.text || !item.category || !item.correct_answer || !item.options) {
          errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }

        if (!['ct', 'web3', 'news'].includes(item.category.toLowerCase())) {
          errors.push(`Row ${i + 1}: Invalid category`);
          continue;
        }

        const opts = item.options;
        if (!opts.a || !opts.b || !opts.c || !opts.d) {
          errors.push(`Row ${i + 1}: All 4 options required`);
          continue;
        }

        questions.push({
          text: item.text,
          category: item.category.toLowerCase(),
          correct_answer: item.correct_answer.toLowerCase(),
          options: opts,
          source_url: item.source_url,
        });
      }
    } else {
      throw new Error('Invalid format. Use csv or json');
    }

    // Bulk insert
    let inserted = 0;
    if (questions.length > 0) {
      const questionRecords = questions.map(q => ({
        text: q.text,
        category: q.category,
        correct_answer: q.correct_answer,
        options: q.options,
        source_url: q.source_url,
        is_active: true,
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

      const { data, error: insertError } = await supabase
        .from('questions')
        .insert(questionRecords)
        .select('id');

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      inserted = data?.length || 0;
    }

    console.log(`Successfully inserted ${inserted} questions with ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        errors: errors.slice(0, 10), // Limit error messages
        total_errors: errors.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
