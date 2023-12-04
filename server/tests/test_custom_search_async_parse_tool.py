# Search tool
from typing import Any, List, Literal
import aiohttp
import os
import asyncio
# Scraping tool
from bs4 import BeautifulSoup
import aiohttp
# Summarizer tool
from summarizer.sbert import SBertSummarizer
summarizer = SBertSummarizer('paraphrase-MiniLM-L6-v2')
def summarize(text, num_sentences=3):
    return summarizer(text, num_sentences=num_sentences)

# ban some sites that we can never scrape
banned_sites = ["calendar.google.com", "researchgate.net"]
# custom search tool, we copied the serper integration on langchain but we prefer all the data to be displayed in one json message
k: int = 3
gl: str = "us"
hl: str = "en"
tbs = None
num_sentences = 10
search_type: Literal["news", "search", "places", "images"] = "search"
serper_api_key = os.environ.get("SERPER_API_KEY")
result_key_for_type = {
        "news": "news",
        "places": "places",
        "images": "images",
        "search": "organic",
    }

async def scrape_page_async(url: str, summarize_page = False, num_sentences = 3):
    """
    Based on your observations from the Search_Engine, if you want more details from
    a snippet for a non-PDF page, pass this the page's URL and the page's title to
    scrape the full page and retrieve the full contents of the page.
    """

    print("Parsing: {}".format(url))
    if any(substring in url for substring in banned_sites):
        print("Skipping site: {}".format(url))
        return None
    else:
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
                'Accept-Encoding': 'none',
                'Accept-Language': 'en-US,en;q=0.8',
                'Connection': 'keep-alive',
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers, timeout=30) as response:
                    response.raise_for_status()
                    content = await response.text()

                    soup = BeautifulSoup(content, 'html.parser')
                    text = " ".join([t.get_text() for t in soup.find_all(
                        ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])])
                    text = text.replace('|', '')

                    if summarize_page:
                        return summarize(text, num_sentences=num_sentences)
                    return text
        except Exception as e:
            print(f"Failed to fetch {url}. Error: {e}")
            return None


async def serper_search_async(
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
    async with aiohttp.ClientSession() as session:
        async with session.post(f"https://google.serper.dev/{search_type}", headers=headers, json=params) as response:
            response.raise_for_status()
            search_results = await response.json()
            return search_results


async def parse_snippets_async(results: dict, scrape_pages: bool = False, summarize_pages: bool = True, num_sentences: int = 3) -> List[str]:
    snippets = []
    if results.get("answerBox"):
        answer_box = results.get("answerBox", {})
        if answer_box.get("answer"):
            snippets.append(f"The answer is {answer_box.get('answer')}")
        elif answer_box.get("snippet"):
            snippets.append(f"The answer might be in the snippet: {answer_box.get('snippet')}")
        elif answer_box.get("snippetHighlighted"):
            snippets.append(f"The answer might be in the snippet: {answer_box.get('snippetHighlighted')}")

    if results.get("knowledgeGraph"):
        kg = results.get("knowledgeGraph", {})
        title = kg.get("title")
        entity_type = kg.get("type")
        if entity_type:
            snippets.append(f"Knowledge Graph Results: {title}: {entity_type}.")
        description = kg.get("description")
        if description:
            snippets.append(f"Knowledge Graph Results: {title}: {description}.")
        for attribute, value in kg.get("attributes", {}).items():
            snippets.append(f"Knowledge Graph Results: {title} {attribute}: {value}.")

    if scrape_pages:
        tasks = []
        for result in results[result_key_for_type[search_type]][:k]:
            task = asyncio.create_task(scrape_page_async(result["link"], summarize_page=summarize_pages, num_sentences=num_sentences))
            tasks.append(task)
        summarized_pages = await asyncio.gather(*tasks)
        for i, page in enumerate(summarized_pages):
            result = results[result_key_for_type[search_type]][i]
            if page:
                snippets.append(f"Title: {result.get('title', '')}\nSource:{result['link']}\nSnippet: {result.get('snippet', '')}\nSummarized Page: {page}")
            else:
                snippets.append(f"Title: {result.get('title', '')}\nSource:{result['link']}\nSnippet: {result.get('snippet', '')}\n")
    else:
        for result in results[result_key_for_type[search_type]][:k]:
            snippets.append(f"Title: {result.get('title', '')}\nSource:{result['link']}\nSnippet: {result.get('snippet', '')}\n")

    if len(snippets) == 0:
        return ["No good Google Search Result was found"]
    return snippets


async def parse_results_async(results: dict) -> str:
    snippets = await parse_snippets_async(results, scrape_pages=False)
    results_string = ""
    for idx, val in enumerate(snippets):
        results_string += f"Res {idx + 1}:\n{val}\n\n"
    return results_string


async def arun_search_tool_for_agents(query: str):
    results = await serper_search_async(
        search_term=query,
        gl=gl,
        hl=hl,
        num=k,
        tbs=tbs,
        search_type=search_type,
    )
    return await parse_results_async(results)

if __name__ == "__main__":
    import time
    start = time.time()
    res = arun_search_tool_for_agents("Statistics on AI taking over jobs in the US 2023")
    print(asyncio.run(res))
    end = time.time()
    print("Time taken: ", end - start, "seconds")