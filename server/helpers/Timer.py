from typing import Optional
from time import perf_counter, strftime, localtime
import warnings
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from server_config import gcp_api_key
import time


class Timer:
    def __init__(self, function_name: str, worksheet: gspread.Worksheet) -> None:
        self.function_name = function_name
        self.worksheet = worksheet
        self.start_time = 0
        self.end_time = 0
        self.duration = 0

    def __enter__(self) -> "Timer":
        self.start_time = perf_counter()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = perf_counter()
        self.duration = self.end_time - self.start_time
        print(f"Elapsed time: {self.duration} seconds")
        self._record_function_timing()

    def elapsed(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return self.duration

        warnings.warn("Timer has not been started or stopped yet", RuntimeWarning)
        return None

    def _record_function_timing(self):
        time_called = strftime("%Y-%m-%d %H:%M:%S", localtime())
        data = [self.function_name, time_called, f"{self.duration:.6f} seconds"]
        self.worksheet.append_row(data)


if __name__ == '__main__':
    def some_function():
        time.sleep(2)

    scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
    creds = ServiceAccountCredentials.from_json_keyfile_name(gcp_api_key, scope)
    client = gspread.authorize(creds)

    spreadsheet_name = 'Time Everything'
    worksheet_name = 'Sheet 1'
    worksheet = client.open(spreadsheet_name).worksheet(worksheet_name)

    with Timer('some_function', worksheet):
       some_function()
