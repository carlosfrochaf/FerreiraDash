-- Petições passam a ter só "não pago" e "pago": as que faltavam validar viram "não pago".
UPDATE "peticoes" SET "status" = 'A_PAGAR', "data_validacao" = NULL WHERE "status" = 'A_VALIDAR';

-- AlterTable
ALTER TABLE "peticoes" ALTER COLUMN "status" SET DEFAULT 'A_PAGAR';

