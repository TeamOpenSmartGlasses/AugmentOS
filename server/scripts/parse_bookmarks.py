#Takes in a Chrome or Brave (probably works with Firefox too) bookmarks export HTML file and spits out CSV for CSE
#python3 parse_bookmarks.py <name of my file>.html

from bs4 import BeautifulSoup
import requests
import scrapy
import json
import pandas as pd
import concurrent.futures
import sys

banned_sites = ["calendar.google.com", "researchgate.net"]

def parse_bookmarks(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    bookmarks = []

    # Get all the 'a' tags (which represent bookmarks)
    for a_tag in soup.find_all('a'):
        bookmark = {
            'title': a_tag.get_text(),
            'url': a_tag['href'],
            'date_added': a_tag.get('add_date', None),
            'tags': a_tag.get('tags', None),
        }
        bookmarks.append(bookmark)

    return bookmarks


def fetch_url(url, urlIdx, title):
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
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')
            text = " ".join([t.get_text() for t in soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])])
            return {
                'url': url,
                #'urlIdx': urlIdx,
                'description': text.replace('|',''),
                'title': title.replace('|','')
            }
        except requests.RequestException as e:
            print(f"Failed to fetch {url}. Error: {e}")
            return {
                'url': url,
                #'urlIdx': urlIdx,
                'description': None,
                'title': title.replace('|','')
            }

file_path = sys.argv[1]
bookmarks = parse_bookmarks(file_path)

# Convert the list of dictionaries to a DataFrame
df = pd.DataFrame(bookmarks)
urls = df["url"].tolist()
urlTitles = df["title"].tolist()
urlIdxs = list(range(len(urls)))
#print(urls)

print("Scraping URLs...")
#urls = urls[:30]  # Your list of URLs

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
    results = list(executor.map(fetch_url, urls, urlIdxs, urlTitles))

#    if result:
#        print(result['url'])
#        print(result['title'])
#        #print(result['urlIdx'])
#        if result['text'] is not None:
#            print(result['text'][:1320])
#        print('-' * 30)

# Remove None values and extract inner dictionaries
valid_results = [result for result in results if result is not None]
df = pd.DataFrame(valid_results)

# Display the DataFrame
print(df)

df.to_csv(sys.argv[1].split(",")[0]+".csv", index=False, escapechar='|')
