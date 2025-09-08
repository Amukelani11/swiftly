import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PricingRequest {
  basketValue: number;
  storeCount: number;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface PricingBreakdown {
  commitmentFee: number;
  serviceFee: number;
  serviceFeePercentage: number;
  serviceFeeCap: number;
  multiStoreSurcharge: number;
  pickPackFee: number;
  pickPackFeeLabel: string;
  subtotal: number;
  total: number;
  breakdown: {
    commitmentFee: { amount: number; label: string; description: string };
    serviceFee: { amount: number; label: string; description: string };
    multiStoreSurcharge: { amount: number; label: string; description: string };
    pickPackFee: { amount: number; label: string; description: string };
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { basketValue, storeCount = 1, items = [] }: PricingRequest = await req.json();

    if (typeof basketValue !== 'number' || basketValue < 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid basket value. Must be a positive number.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (typeof storeCount !== 'number' || storeCount < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid store count. Must be at least 1.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const commitmentFee = 30;
    const serviceFeePercentage = 0.04;
    const serviceFeeCap = 50;
    const multiStoreSurchargePerStore = 15;

    const serviceFee = Math.min(basketValue * serviceFeePercentage, serviceFeeCap);
    const multiStoreSurcharge = storeCount > 1 ? (storeCount - 1) * multiStoreSurchargePerStore : 0;

    let pickPackFee = 0;
    let pickPackFeeLabel = 'Personal Shopper Fee';

    if (basketValue < 150) {
      pickPackFee = 0;
    } else if (basketValue >= 150 && basketValue <= 800) {
      pickPackFee = 13;
    } else {
      pickPackFee = 25;
    }

    const subtotal = commitmentFee + serviceFee + multiStoreSurcharge + pickPackFee;
    const total = basketValue + subtotal;

    const breakdown: PricingBreakdown = {
      commitmentFee,
      serviceFee,
      serviceFeePercentage: serviceFeePercentage * 100,
      serviceFeeCap,
      multiStoreSurcharge,
      pickPackFee,
      pickPackFeeLabel,
      subtotal,
      total,
      breakdown: {
        commitmentFee: {
          amount: commitmentFee,
          label: 'Commitment Fee',
          description: 'Covers travel + delivery. Always upfront.'
        },
        serviceFee: {
          amount: serviceFee,
          label: 'Service Fee',
          description: `${serviceFeePercentage * 100}% of basket value (capped at R${serviceFeeCap})`
        },
        multiStoreSurcharge: {
          amount: multiStoreSurcharge,
          label: 'Multi-Store Surcharge',
          description: storeCount > 1 
            ? `R${multiStoreSurchargePerStore} per extra store (${storeCount - 1} extra stores)`
            : 'Single store order'
        },
        pickPackFee: {
          amount: pickPackFee,
          label: pickPackFeeLabel,
          description: pickPackFee > 0 
            ? 'Personal shopper fee for picking items (not just collecting a bag)'
            : 'No personal shopper fee for small orders'
        }
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: breakdown,
        summary: {
          basketValue: basketValue,
          totalFees: subtotal,
          totalCost: total,
          storeCount: storeCount,
          itemCount: items.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error calculating pricing:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});