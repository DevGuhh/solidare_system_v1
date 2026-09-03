-- Adiciona a opção OUTROS ao enum compartilhado de tipo de benefício/doação.
ALTER TYPE "public"."TipoBeneficio" ADD VALUE IF NOT EXISTS 'OUTROS';
