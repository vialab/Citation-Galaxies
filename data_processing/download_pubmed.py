import os
import re
from glob import glob
from datetime import datetime
import random
import subprocess
import pubmed_parser as pp

from utils import get_update_date

# directory
home_dir = os.path.expanduser('~')
download_dir = os.path.join(home_dir, 'Downloads')
unzip_dir = os.path.join(download_dir, 'pubmed_oa') # path to unzip tar file
save_dir = os.path.join(home_dir, 'tmp')


def update():
    """Download and update file"""
    save_file = os.path.join(save_dir, 'pubmed_oa_*_*_*.parquet')
    file_list = list(filter(os.path.isdir, glob(save_file)))
    # if file_list:
    if file_list:
        d = re.search('[0-9]+_[0-9]+_[0-9]+', file_list[0]).group(0)
        date_file = datetime.strptime(d, '%Y_%m_%d')
        date_update = get_update_date(option='oa')
        # if update is newer
        is_update = date_update > date_file
        if is_update:
            print("MEDLINE update available!")
            subprocess.call(['rm', '-rf', os.path.join(save_dir, 'pubmed_oa_*_*_*.parquet')]) # remove
            subprocess.call(['rm', '-rf', download_dir, 'pubmed_oa'])
            subprocess.call(['wget', 'ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.A-B.xml.tar.gz', '--directory', download_dir])
            if not os.path.isdir(unzip_dir): os.mkdir(unzip_dir)
            subprocess.call(['tar', '-xzf', os.path.join(download_dir, 'non_comm_use.A-B.xml.tar.gz'), '--directory', unzip_dir])
        else:
            print("No update available")
    else:
        print("Download Pubmed Open-Access for the first time")
        is_update = True
        date_update = get_update_date(option='oa')
        subprocess.call(['wget', 'ftp://ftp.ncbi.nlm.nih.gov/pub/pmc/oa_bulk/non_comm_use.A-B.xml.tar.gz', '--directory', download_dir])
        if not os.path.isdir(unzip_dir): os.mkdir(unzip_dir)
        subprocess.call(['tar', '-xzf', os.path.join(download_dir, 'non_comm_use.A-B.xml.tar.gz'), '--directory', unzip_dir])
    return is_update, date_update


if __name__ == "__main__":
    update()