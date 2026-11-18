import importlib.util
from pathlib import Path
import unittest
import pandas as pd

spec = importlib.util.spec_from_file_location('etf_data', Path(__file__).with_name('etf_data.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReturnsTest(unittest.TestCase):
    def test_calendar_cutoffs_and_prior_year_end(self):
        data = pd.DataFrame({'Close': [100, 110, 115, 120, 125]}, index=pd.to_datetime(['2025-12-31', '2026-01-30', '2026-02-20', '2026-02-26', '2026-02-27']))
        result = module.performance_from_prices(data)
        self.assertAlmostEqual(result['day'], (125 / 120 - 1) * 100)
        self.assertAlmostEqual(result['week'], (125 / 115 - 1) * 100)
        self.assertAlmostEqual(result['month'], 25)  # Jan 27 has no observation: prior available close.
        self.assertAlmostEqual(result['ytd'], 25)

    def test_missing_history_is_not_zero_return(self):
        data = pd.DataFrame({'Close': [100, 101]}, index=pd.to_datetime(['2026-02-26', '2026-02-27']))
        result = module.performance_from_prices(data)
        self.assertIsNone(result['week'])
        self.assertIsNone(result['month'])
        self.assertIsNone(result['ytd'])

if __name__ == '__main__':
    unittest.main()
