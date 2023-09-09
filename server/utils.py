from typing import Optional, Any
from langchain.tools import BaseTool
from datetime import datetime
from pathlib import Path
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings

from pydantic import BaseModel
from typing import Optional, Any, Type

MAX_POSSIBLE_TIME = 120


class UnitMemory:
    """
    A unit memory is a single memory. It is a single memory in a list of memories.

    Attributes:
        text (str): The text of the memory.
        timestamp (int): The timestamp of the memory.

    """

    def __init__(self, text, timestamp, isFinal=True):
        self.text = text
        self.timestamp = timestamp
        self.isFinal = isFinal

    def get_text(self):
        return self.text

    def get_isFinal(self):
        return self.isFinal

    def update_text(self, newText):
        self.text = newText

    def get_transcript(self):
        return self.transcript

    def __str__(self):
        return f'{self.timestamp}: {self.text}'


class ShortTermMemory:
    """
    An event memory is a memory that is a list of unit memories. It signifies a conversation or event.
    """

    def __init__(self, max_time=120):
        self.memories = []
        # needs to be below the prompt size
        self.max_time = min(max_time, MAX_POSSIBLE_TIME)

        # TODO: Separate into own class?
        self.most_recent_memory = None
        self.most_recent_memory_consumed = False

    def __str__(self):
        return ','.join([str(m) for m in self.memories])

    def get_start_time(self):
        if len(self.memories) == 0:
            return 0
        return self.memories[0].timestamp

    def get_memories(self):
        return self.memories

    # Set/Update most_recent_memory
    # If the new text is different, mark it as not-consumed
    def update_recent_memory_sliding(self, memory):
        if self.most_recent_memory is not None and self.most_recent_memory.get_text() != memory.get_text():
            self.most_recent_memory_consumed = False
        self.most_recent_memory = memory

    # most_recent_memory is "consumed" upon retrieval
    def get_most_recent_memory_sliding(self, slider=6):
        recent = ""
        if not self.most_recent_memory_consumed and self.most_recent_memory is not None:
            wl = self.most_recent_memory.get_text().split()
            recent = ' '.join(wl[len(wl)-slider::]
                              if slider <= len(wl) else wl[0::])
            self.most_recent_memory_consumed = True
        return recent

    def get_end_time(self):
        if len(self.memories) == 0:
            return 0
        return self.memories[-1].timestamp

    def add_memory(self, memory: UnitMemory):
        decayed_memories = []

        # remove old memories
        while self.get_end_time() - self.get_start_time() > self.max_time:
            m = self.memories.pop(0)
            decayed_memories.append(m)

        # if self.get_end_time() - self.get_start_time() > self.max_time:
        #     decayed_memories = self.memories
        #     self.memories = []

        # self.memories only saves final transcripts, but most_recent_memory stores everything
        self.update_recent_memory_sliding(memory)
        if memory.get_isFinal():
            self.memories.append(memory)

        return decayed_memories


class LongTermMemory:

    def __init__(self, userID):
        self.emb_fn = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        self.persist_directory = str(Path('memory_db') / userID)

        self.db = Chroma(
            collection_name="memories",
            embedding_function=self.emb_fn,
            persist_directory=self.persist_directory
        )

    def __str__(self):
        return self.db.get()

    def add_memory(self, memory):
        filtered_memory = self.filter_memory(memory)
        if len(filtered_memory.text) < 5:
            return
        self.db.add_texts([filtered_memory.text], {
                          "timestamp": filtered_memory.timestamp})

    def add_memories(self, memories):
        # full_memories = ".".join([m.text for m in memories])
        # self.db.add_texts([full_memories], {"timestamp": memories[0].timestamp})
        for memory in memories:
            self.add_memory(memory)

    def filter_memory(self, memory):
        # remove filler words in the memory
        filler_words = ['um', 'uh']
        for word in filler_words:
            memory.text = memory.text.replace(word, '')
        return memory

    def retrieve_memories_in_time_range(self, start_time, end_time):
        time_query = {
            "$and": [
                {
                    "timestamp": {"$gte": start_time}
                },
                {
                    "timestamp": {"$lte": end_time}
                }
            ]
        }
        return self.db._collection.get(where=time_query)

    def retrieve_memories_query(self, full_query):
        retrieved_memories = self.db._collection.query(**full_query)
        retrieved_docs = retrieved_memories['documents'][0]
        return "\n".join(retrieved_docs)

############## Agent #####################


class TimeNavigator(BaseTool):
    name = "Time navigator"
    description = "A tool that helps you navigate time and collect transcripts given the start and end time in the 24 hour format of %m/%d/%Y, %H:%M:%S."
    ltm_memory: LongTermMemory = None

    def _run(self, start_time: str, end_time: str):
        # convert the time to timestamp in system time
        start_time = datetime.strptime(
            start_time.strip(), '%m/%d/%Y, %H:%M:%S')
        end_time = datetime.strptime(end_time.strip(), '%m/%d/%Y, %H:%M:%S')

        start_time_timestamp = start_time.timestamp()
        end_time_timestamp = end_time.timestamp()

        # get the memories in the time range
        focus_logs = self.ltm_memory.retrieve_memories_in_time_range(
            start_time_timestamp, end_time_timestamp)

        print("Found these Logs")
        found_logs = '\n'.join(focus_logs)
        return found_logs

    def _arun(self, start_time, end_time):
        raise NotImplementedError(
            "This tool does not support asynchronous execution.")


class CurrentTime(BaseTool):
    name = "Current Time"
    description = "A tool that helps you get the time and date right now. You need it for calculating the time range for the Time Navigator tool"

    def _run(self):
        return '06/16/2023, 17:37:43'
        return datetime.now().strftime("%m/%d/%Y, %H:%M:%S")

    def _arun(self, start_time, end_time):
        raise NotImplementedError(
            "This tool does not support asynchronous execution.")


# TODO(wazeer): make a tool to use the vectorstore to find the memories that are needed by forming the query to the vectorstore
class MemoryRetriever(BaseTool):
    name = "Memory Retriever"
    description = "A tool that helps you retrieve memories from your long term memory. You can pass in a query and a time range to retrieve the memories. The time range is OPTIONAL, use it only if the query requires you to select a certain time range. The times have to be in the 24 hour format of %m/%d/%Y, %H:%M:%S "
    # args_schema : Type[BaseModel] = QueryRetriever
    ltm_memory: LongTermMemory = None

    def _run(self, query: str, start_time: Optional[str] = "", end_time: Optional[str] = ""):

        if len(query) == 0:
            start_time = datetime.strptime(
                start_time.strip(), '%m/%d/%Y, %H:%M:%S').timestamp()
            end_time = datetime.strptime(
                end_time.strip(), '%m/%d/%Y, %H:%M:%S').timestamp()
            memories = self.ltm_memory.retrieve_memories_in_time_range(
                start_time, end_time)
            return memories
        else:
            full_query = {
                "query_texts": query,
            }
            if len(start_time) > 5 and len(end_time) > 5:
                # convert the time to timestamp in system time
                start_time = datetime.strptime(
                    start_time.strip(), '%m/%d/%Y, %H:%M:%S').timestamp()
                end_time = datetime.strptime(
                    end_time.strip(), '%m/%d/%Y, %H:%M:%S').timestamp()

                full_query["where"] = {
                    "$and": [
                        {
                            "timestamp": {"$gte": start_time}
                        },
                        {
                            "timestamp": {"$lte": end_time}
                        }
                    ]
                }

            memories = self.ltm_memory.retrieve_memories_query(full_query)

            # may need to summarize the memories depending on the length
            return memories

    def _arun(self):
        raise NotImplementedError(
            "This tool does not support asynchronous execution.")
