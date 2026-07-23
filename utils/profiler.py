# utils/profiler.py

import time

class StageProfiler:

    def __init__(self):
        self.records = []

    def start(self):
        return time.perf_counter()

    def stop(
        self,
        stage,
        start_time,
        prompt=None,
        response=None
    ):
        self.records.append({

            "stage": stage,

            "seconds":
                round(
                    time.perf_counter() - start_time,
                    3
                ),

            "prompt_chars":
                len(prompt)
                if prompt else 0,

            "response_chars":
                len(str(response))
                if response else 0
        })

    def report(self):

        print("\nLATENCY REPORT\n")

        total = 0

        for r in self.records:

            total += r["seconds"]

            print(

                f"{r['stage']:25}",

                f"{r['seconds']:8.3f}s",

                f"prompt={r['prompt_chars']}",

                f"response={r['response_chars']}"
            )

        print("\nTOTAL:", round(total, 3), "seconds")