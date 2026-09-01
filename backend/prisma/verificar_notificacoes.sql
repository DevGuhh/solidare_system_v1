SELECT
  COUNT(*) FILTER (WHERE "tipo" IS NULL) AS tipo_nulos,
  COUNT(*) FILTER (WHERE "lida" IS NULL) AS lida_nulos,
  COUNT(*) FILTER (WHERE "instituicaoId" IS NULL) AS instituicao_id_nulos
FROM "notificacoes";
