# Search tool
from typing import Any, List, Literal
import requests
import os
import asyncio

from langchain.tools import WikipediaQueryRun
from langchain.utilities import WikipediaAPIWrapper

wikipedia = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())

k: int = 1
gl: str = "us"
hl: str = "en"
tbs = None
num_sentences = 7
serper_api_key = os.environ.get("SERPER_API_KEY")
search_type: Literal["news", "search", "places", "images"] = "search"


async def serper_search(
    search_term: str, search_type: str = "search", **kwargs: Any
) -> dict:
    headers = {
        "X-API-KEY": serper_api_key or "",
        "Content-Type": "application/json",
    }
    params = {
        "q": search_term,
        **{key: value for key, value in kwargs.items() if value is not None},
    }
    response = requests.post(
        f"https://google.serper.dev/{search_type}", headers=headers, params=params
    )
    response.raise_for_status()
    search_results = response.json()
    return search_results


async def parse_snippets(search_term: str, results: dict) -> str:
    result_key_for_type = {
        "news": "news",
        "places": "places",
        "images": "images",
        "search": "organic",
    }
    snippets = [f"Search Term: {search_term}"]
    # print(results)

    if results.get("knowledgeGraph"):
        knowledge_graph = results.get("knowledgeGraph", {})
        snippets.append(f"Description: {knowledge_graph.get('description')}, Source: {knowledge_graph.get('descriptionLink')}")
    # # Add the answer box if present
    # if results.get("answerBox"):
    #     answer_box = results.get("answerBox", {})
    #     answer = (
    #         answer_box.get("answer")
    #         or answer_box.get("snippet")
    #         or answer_box.get("snippetHighlighted")
    #     )
    #     if answer:
    #         snippets.append(f"Answer Box: {answer}")

    # # Add top k search results
    # for result in results[result_key_for_type[search_type]][:k]:
    #     snippet = result.get("snippet")
    #     snippets.append(f"Answer: {snippet}, Source: {result.get('link')}")

    return "\n".join(snippets)


async def custom_search(search_terms: List[str], **kwargs: Any) -> List[str]:
    tasks = []
    for search_term in search_terms:
        search_term = "Definition of " + search_term
        task = asyncio.create_task(serper_search(search_term, **kwargs))
        tasks.append(task)
    results = await asyncio.gather(*tasks)
    return [
        await parse_snippets(term, result)
        for term, result in zip(search_terms, results)
    ]


# Example of how to use the modified function
async def main():
    search_terms = ["Theory of everything", "Bhutan", "Beam Search", "Illiad", "Nonplussed"]
    results = await custom_search(search_terms)
    for result in results:
        print(result)


# Run the main function if you want to test the code
asyncio.run(main())

# res = wikipedia.run("Python")
# print(res)