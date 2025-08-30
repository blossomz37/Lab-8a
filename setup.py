#!/usr/bin/env python3
"""
Setup script for Tropes Manager
A local web application for managing writing tropes
"""

from setuptools import setup, find_packages
import os

# Read the README file for long description
def read_readme():
    with open('README.md', 'r', encoding='utf-8') as f:
        return f.read()

# Read requirements from requirements.txt
def read_requirements():
    with open('requirements.txt', 'r', encoding='utf-8') as f:
        return [line.strip() for line in f.readlines() if line.strip() and not line.startswith('#')]

setup(
    name='tropes-manager',
    version='1.0.0',
    description='A fast, private, and user-friendly local web application for managing writing tropes',
    long_description=read_readme(),
    long_description_content_type='text/markdown',
    author='Carlo',
    author_email='',
    url='',
    
    # Package configuration
    packages=find_packages(exclude=['tests*', 'venv*', 'archive*']),
    include_package_data=True,
    zip_safe=False,
    
    # Dependencies
    install_requires=read_requirements(),
    
    # Python version requirement
    python_requires='>=3.8',
    
    # Package data
    package_data={
        '': ['templates/*.html', 'static/*.css', 'static/*.js', 'data/*.csv', 'db/*.db'],
    },
    
    # Entry points
    entry_points={
        'console_scripts': [
            'tropes-manager=app:main',
        ],
    },
    
    # Classifiers for PyPI (if you ever want to publish)
    classifiers=[
        'Development Status :: 5 - Production/Stable',
        'Intended Audience :: End Users/Desktop',
        'Topic :: Internet :: WWW/HTTP :: Dynamic Content',
        'Topic :: Text Processing :: General',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
        'Programming Language :: Python :: 3.10',
        'Programming Language :: Python :: 3.11',
        'Programming Language :: Python :: 3.12',
        'Programming Language :: Python :: 3.13',
        'Framework :: Flask',
        'Environment :: Web Environment',
        'Operating System :: OS Independent',
    ],
    
    # Keywords for searchability
    keywords='tropes writing flask web-app local database sqlite crud',
    
    # Project URLs
    project_urls={
        'Bug Reports': '',
        'Source': '',
        'Documentation': '',
    },
)