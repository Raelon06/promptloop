import json
import unittest
from unittest.mock import patch
from app.benchmark import _evaluate, run_benchmark
from app.providers import RemoteProvider, ProviderResult
from test_benchmark import fixture, fake_plan, FIELDS


class SchemaAwareFixture:
    def __init__(self):
        self.schemas = []
    def generate_structured(self, system, user, attempt, schema):
        self.schemas.append(schema)
        if 'Miktar: 24 karton' in user:
            return ProviderResult('{"dealer":"D000123","quantity":24}', 90, 22)
        return ProviderResult('{"dealer":"D000123","quantity":null}', 90, 18)


class StructuredBenchmarkTests(unittest.TestCase):
    def test_nullable_abstain(self):
        c = fixture().cases[1]
        self.assertEqual(_evaluate('{"dealer":"D000123","quantity":null}', c, FIELDS), (True, 'CORRECT_ABSTAIN'))
        self.assertEqual(_evaluate('{"dealer":"D000123","quantity":null}', fixture().cases[0], FIELDS), (False, 'INCORRECT_ABSTAIN'))

    def test_schema_still_rejects_unexpected_fields(self):
        c = fixture().cases[1]
        ok, code = _evaluate('{"dealer":null,"quantity":null,"extra":1}', c, FIELDS)
        self.assertFalse(ok)
        self.assertEqual(code, 'FIELD_SET_MISMATCH')

    def test_genuine_schema_sent_to_adapter(self):
        adapter = SchemaAwareFixture()
        result = run_benchmark(fixture(), provider=adapter, plan=fake_plan(), repetitions=1)
        self.assertEqual(result['comparison']['original']['correct'], 2)
        self.assertEqual(result['comparison']['optimized']['correct'], 2)
        self.assertEqual(result['structured_output_mode'], 'OLLAMA_JSON_SCHEMA')
        self.assertEqual(len(adapter.schemas), 4)
        for schema in adapter.schemas:
            self.assertEqual(schema['type'], 'object')
            self.assertEqual(set(schema['required']), {'dealer', 'quantity'})
            self.assertFalse(schema['additionalProperties'])
            self.assertEqual(schema['properties']['quantity']['type'], ['integer', 'null'])

    def test_provider_payload_uses_schema_not_json_string(self):
        with patch('app.providers._post', return_value={
            'message': {'content': '{"dealer":"D000123","quantity":24}'},
            'prompt_eval_count': 45, 'eval_count': 16
        }) as posted:
            adapter = RemoteProvider('ollama', 'qwen3:4b')
            schema = {'type':'object','properties':{'dealer':{'type':'string'}},'required':['dealer']}
            response = adapter.generate_structured('system', 'user', 1, schema)
            payload = posted.call_args.args[1]
            self.assertEqual(payload['format'], schema)
            self.assertIsInstance(payload['format'], dict)
            self.assertFalse(payload['think'])
            self.assertEqual(response.output_tokens, 16)

if __name__ == '__main__':
    unittest.main()
