
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS crisis_level smallint NOT NULL DEFAULT 0 CHECK (crisis_level BETWEEN 0 AND 4);

UPDATE public.incidents SET crisis_level = CASE id
  WHEN '0f42831d-4366-4aa3-9c5b-63aad4427f74'::uuid THEN 3
  WHEN '0a31aa1d-0f33-49ed-a40c-2efa9e6b4edf'::uuid THEN 3
  WHEN 'a435556b-53b9-47e6-8b2b-0b18adab3b27'::uuid THEN 2
  WHEN '21394c5c-1a3c-479c-a891-baca238378c5'::uuid THEN 2
  WHEN '66d8b8c5-887e-494f-84b8-ade89a8e696e'::uuid THEN 2
  WHEN 'd8db3e7a-3ec9-4c12-a1b3-06bbbb6d9798'::uuid THEN 2
  WHEN '62c885dc-bcfd-44c6-9f8b-16b0732cd056'::uuid THEN 2
  WHEN 'f18402e7-24a0-4972-91aa-e9cf65797af1'::uuid THEN 2
  WHEN '45e3a76a-9a99-4fa7-a56a-6a9f3fa8b1ec'::uuid THEN 1
  WHEN 'e42e8810-a5d9-4c63-ade2-4371c8818faa'::uuid THEN 1
  WHEN '14b40788-37be-483b-bd93-fa662f7cd6ea'::uuid THEN 1
  WHEN '3053d575-9fbe-4b80-ae67-f00d4998215e'::uuid THEN 1
  WHEN '99b4df73-00e1-488f-9607-9185c792af81'::uuid THEN 1
  WHEN '589e6fb6-f8a3-4be2-a87b-5f6ed133a627'::uuid THEN 1
  WHEN '60f640c1-8204-4bf3-96c6-a06908b06c4b'::uuid THEN 1
  WHEN '7398e9e2-fcdb-4c3b-b47c-cb15465beafd'::uuid THEN 1
  WHEN '5a2bcfa0-308d-4a8e-abf4-ffbe8a90cae7'::uuid THEN 1
  WHEN '51aa2e7e-66d9-464f-9fce-d94d71985607'::uuid THEN 1
  WHEN 'd4d6b9b4-36ab-4426-95f2-286a7ee8343c'::uuid THEN 1
  WHEN '0ab704ed-eb25-4d74-9e4d-f15891ce2674'::uuid THEN 1
  WHEN '2670f80e-8f31-4926-9731-c7ff8cc5b86d'::uuid THEN 1
  WHEN 'd4ef7be8-6d3b-406c-9d44-19b72901f4df'::uuid THEN 1
  WHEN 'e1dc800a-bfb2-476b-81b7-79b66276a1a6'::uuid THEN 1
  WHEN 'e6f0d96d-7543-4f2c-8385-40750177f962'::uuid THEN 1
  WHEN 'bbc36a2d-ab73-42d7-98ad-2484884100d9'::uuid THEN 1
  WHEN '97c58b41-56a4-4644-aaee-a7aca3a67d3b'::uuid THEN 1
  WHEN '7ae19d21-842e-463f-8313-c88f87b865eb'::uuid THEN 1
  WHEN 'bc7ca326-3d9b-4da5-b49d-621c78e57d52'::uuid THEN 1
  WHEN '68be7788-ff69-47f1-baa4-5ba22846a98f'::uuid THEN 0
  WHEN 'd05f2162-1b3f-4e70-99c1-53b05a29d4c0'::uuid THEN 0
  WHEN '527ff79d-415c-492e-8354-460c1dbfa34d'::uuid THEN 0
  WHEN 'dc36c514-e36f-4bb8-9db0-fe0d9cf32b0c'::uuid THEN 0
  WHEN '60af033a-836a-4003-a576-b80301456cfe'::uuid THEN 0
  WHEN 'd4d63b96-c699-45d1-8c59-84c2c061bcf4'::uuid THEN 0
  WHEN '8446b8a6-9e5d-4e00-a233-634a4ccca5fe'::uuid THEN 0
  WHEN '304786f3-c561-4cf3-a7dc-d4068ff83c8f'::uuid THEN 0
  WHEN '269e30b4-1996-4260-ae8d-46980ba91a34'::uuid THEN 0
  WHEN '9b76f633-bc63-47ac-8fd8-70d5b229f27f'::uuid THEN 0
  ELSE crisis_level
END;
