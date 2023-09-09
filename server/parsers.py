
from pydantic import BaseModel, Field


class retrieve_memory(BaseModel):
    query: str = Field(
        description="The query to retrieve memories. Use it only if there are keywords to retrieve with")
    start_time: str = Field(
        description="The start time of the query in the format MM/DD/YYYY, HH:MM:SS")
    end_time: str = Field(
        description="The end time of the query in the format MM/DD/YYYY, HH:MM:SS")
