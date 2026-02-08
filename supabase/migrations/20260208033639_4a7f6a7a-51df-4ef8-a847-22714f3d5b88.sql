-- Enable realtime for budget tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_budgets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.envelopes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.envelope_allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incomes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;