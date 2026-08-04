-- Migration: 028_material_orders_delete_policy.sql
-- Allow authenticated users to delete their own material_orders rows.
-- Required for Pre-Invoice card "Delete" cascade cleanup.

create policy "Users can delete own material orders"
  on public.material_orders for delete
  to authenticated
  using (auth.uid() = user_id);
