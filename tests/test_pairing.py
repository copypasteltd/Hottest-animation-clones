from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))

from ai_motion_library.pairing import order_variant_plans


def plan(item, variant, **changes):
    return {
        'run_id': 'demo', 'item_id': item, 'variant': variant,
        'input_scope': 'whole_video', 'source': {'sha256': item}, **changes,
    }


class PairedPlanTests(unittest.TestCase):
    def test_orders_matching_variants_in_source_groups(self):
        inputs = [plan(item, variant) for item in ('one', 'two', 'three')
                  for variant in ('BM01', 'SA02')]
        ordered = [(item['item_id'], item['variant']) for item in order_variant_plans(inputs)]
        self.assertEqual(ordered, [('one', 'SA02'), ('two', 'SA02'),
                                  ('one', 'BM01'), ('two', 'BM01'),
                                  ('three', 'SA02'), ('three', 'BM01')])

    def test_requires_both_plans_even_when_one_is_blocked(self):
        first = plan('one', 'SA02', blocked_reason='Missing target image')
        second = plan('one', 'BM01')
        self.assertEqual(order_variant_plans([first, second]), [first, second])
        with self.assertRaisesRegex(ValueError, 'Missing BM01'):
            order_variant_plans([first])

    def test_rejects_mismatched_source_and_duplicate_version(self):
        anime = plan('one', 'SA02')
        with self.assertRaisesRegex(ValueError, 'same source video'):
            order_variant_plans([anime, plan('one', 'BM01', source={'sha256': 'other'})])
        with self.assertRaisesRegex(ValueError, 'Duplicate SA02'):
            order_variant_plans([anime, anime])
