#!/usr/bin/env bash

URLS="ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.A-B.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.C-H.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.I-N.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.O-Z.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/comm_use.A-B.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/comm_use.C-H.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/comm_use.I-N.xml.tar.gz
ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/comm_use.O-Z.xml.tar.gz"

wd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


download_urls() {
	echo -e "Downloading PubMed Open Access Bulk Data - Commercial & Non-Commercial"

	for url in ${URLS}; do
		filename="${url##*/}"
		if [ ! -f "${wd}/pubmed_download_bulk/${filename}" ]; then
			echo -e "Downloading: ${url}"
			wget "${url}" --directory "${wd}/pubmed_download_bulk" -q --show-progress
		else
			echo -e "Already have ${url}, skipping"
		fi
	done
}

extract_urls() {
	echo -e "Extracting PubMed Data"

	mkdir -p "${wd}/non_commercial"
	mkdir -p "${wd}/commercial"

	for file in "${wd}/pubmed_download_bulk/"non_*; do
		echo $file
		tar -xzf "${file}" -C "${wd}/non_commercial"
	done

	for file in "${wd}/pubmed_download_bulk/"comm_*; do
		echo $file
		tar -xzf "${file}" -C "${wd}/commercial"
	done
}

#download_urls
extract_urls
