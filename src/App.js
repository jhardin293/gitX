import React, { Component } from 'react';
import './App.css';
import logo from './gitx-alt.png';
import search from './search.svg';
import close from './close.svg'
import commitIcon from './git-commit.svg'
import DataTable from 'react-data-table-component';
import SlidingPane from 'react-sliding-pane';
import Modal from 'react-modal';
import Autosuggest from 'react-autosuggest';
import moment from 'moment';
import { debounce } from 'throttle-debounce';
import 'react-sliding-pane/dist/react-sliding-pane.css';




const columns = [
  {
    name: 'Repository',
    selector: 'repository',
    sortable: true,
  },
  {
    name: 'Issues',
    selector: 'issues',
    sortable: true,
    hide: 634
  },
  {
    name: 'Stars',
    selector: 'stars',
    sortable: true,
    hide: 920
  },
  {
    name: 'Forks',
    selector: 'forks',
    sortable: true,
    hide: 1002
  },
  {
    name: 'Created',
    selector: 'created',
    format: row => moment(row.created).format("l"),
    sortable: true,
    hide: 800
  },
  {
    name: 'Updated',
    selector: 'updated',
    format: row => moment(row.updated).format("l"),
    sortable: true,
    hide: 800
  },
  {
    name: 'Commits',
    selector: 'commits',
    cell: row => <SelectCommit repo={row} />,
    button: true,
    sortable: true,
    ignoreRowClick: true
  },
];

class SelectCommit extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPaneOpen: false,
      commits: []
    };
  }
  componentWillMount() {
    Modal.setAppElement('body');
  }
  panelOpen() {
    if (this.props.repo.commits > 1) {
      this.getListOfCommits(this.props.repo.owner, this.props.repo.repository);
    }
  }

  getListOfCommits = (owner, repo) => {
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits`)
      .then(response => response.json())
      .then(data => {
        const commits = data.map((commit) => {
          return {
            date: commit.commit.author.date,
            name: (commit.committer != null) ? commit.committer.login : commit.commit.committer.email,
            message: commit.commit.message,
            avatar: (commit.committer != null) ? commit.committer.avatar_url : "https://avatars0.githubusercontent.com/u/11183508?v=4"
          }
        });
        const groups = commits.reduce((groups, commit) => {
          const date = commit.date.split('T')[0];
          if (!groups[date]) {
            groups[date] = [];
          }
          groups[date].push(commit);
          return groups;
        }, {});
        const groupArrays = Object.keys(groups).map((date, idx) => {
          return {
            date,
            commits: groups[date]
          };
        });
        this.setState({ commits: groupArrays });
      })
      .catch(error => console.error(error))



  }

  render() {
    const commitsList = this.state.commits.map((commit, idx) => {
      return (
        <div key={idx}>
          <div className="commit-group-title">
            <img src={commitIcon}></img>
            <span>Commits on {moment(commit.date).format("l")}</span>
          </div>
          <ol className="commit-group">
            {
              commit.commits.map((item, idx) => {
                return (
                  <li className="commit-list-item" key={idx}>
                    <p className="commit-title">{item.message}</p>
                    <div className="commit-meta">
                      <img src={item.avatar}></img>
                      <div>{item.name} committed on {moment(item.date).format("l")}</div>
                    </div>
                  </li>
                )
              })
            }
          </ol>

        </div>
      )
    })
    return (
      <div>
        <div className="highlight" onClick={() => this.setState({ isPaneOpen: true })}>
          <button>
            {this.props.repo.commits}
          </button>
        </div>
        <SlidingPane
          className='commit-pane'
          isOpen={this.state.isPaneOpen}
          width="40%"
          title={this.props.repo.repository}
          onAfterOpen={() => { this.panelOpen() }}
          onRequestClose={() => {
            // triggered on "<" on left top click or on outside click
            this.setState({ isPaneOpen: false })
          }} >
          <div className="sub-header">
            <h3><strong>{this.props.repo.commits}</strong> total commits for branch: Master</h3>
          </div>
          <div className="commits-listing" >
            {commitsList}
          </div>
        </SlidingPane>
      </div>

    )

  }
}



class ExpandedSection extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <div className="expandedSection">
        <div className="ex-description">{this.props.data.description}</div>
        <div>
          <p className="ex-issues"><span>Issues</span> : {this.props.data.issues}</p>
          <p className="ex-stars"><span>Stars</span>  : {this.props.data.stars}</p>
          <p className="ex-forks"><span>Forks</span>  : {this.props.data.forks}</p>
          <p className="ex-created"><span>Created</span>  : {moment(this.props.data.created).format("l")}</p>
          <p className="ex-updated"><span>Updated</span>  : {moment(this.props.data.updated).format("l")}</p>
        </div>
      </div>
    )
  }
};


function getMatchingRes(value, res) {
  const escapedValue = escapeRegexCharacters(value.trim());

  if (escapedValue === '') {
    return [];
  }

  const regex = new RegExp('^' + escapedValue, 'i');

  return res.items.filter(org => regex.test(org.login));
}
function escapeRegexCharacters(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isPaneOpen: false,
      value: '',
      suggestions: [],
      selectedOrg: {},
      repoData: [],
      stickHeader: false,
      hideStickyHeader: false,
      orgData: {},
      emptyTableMsg: ""
    };
    this.repoData = []
    this.autocompleteSearchDebounced = debounce(500, this.loadSuggestions);
  }

  loadSuggestions(value) {
    this.setState({
      isLoading: true,
      hideStickyHeader: true,
    });

    fetch(`https://api.github.com/search/users?q=${value}+type:org`)
      .then(response => response.json())
      .then(data => {
        this.setState({
          isLoading: false,
          suggestions: getMatchingRes(value, data)
        });
      })
      .catch(error => console.error(error))
  }

  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue
    });
  };
  onSuggestionsFetchRequested = ({ value }) => {
    this.autocompleteSearchDebounced(value);
  };

  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: [],
      hideStickyHeader: false
    });
  };

  getOrgData = (orgName) => {
    fetch(`https://api.github.com/orgs/${orgName}`, {
      headers: {
        'Accept': 'application/vnd.github.mercy-preview+json'
      }
    })
      .then(response => response.json())
      .then(org => {
        this.setState({
          orgData: {
            name: org.name,
            repoCount: org.public_repos,
            description: org.description,
            avatar_url: org.avatar_url
          }
        })
      })
      .catch(error => console.error(error))
  }

  getrepoData = (url) => {
    fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.mercy-preview+json'
      }
    })
      .then(response => response.json())
      .then(repos => {
        const repoList = repos.map((repo) => {
          return {
            id: repo.id,
            repository: repo.name,
            owner: repo.owner.login,
            issues: repo.open_issues_count,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            created: repo.created_at,
            updated: repo.updated_at,
            description: repo.description,
            topics: repo.topics,
            commits: 0
          }
        })
        this.repoData = repoList;
        this.getCommitData(this.repoData);
      })
      .catch(error => console.error(error))

  }

  getCommitData = (repoList) => {
    const promiseArray = []
    const API_KEY = process.env.REACT_APP_GITHUB_API_KEY
    repoList.forEach((repo, idx) => {
      promiseArray.push(fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${API_KEY}`
        },
        body: JSON.stringify({
          query: `
    query ($owner: String!, $name: String!){
      repository(owner:$owner , name: $name) {
        name
        ref (qualifiedName: "master") {
            target {
              ... on Commit {
                id
                history(first:0) {
                  totalCount
                }
              }
            }
          }
        }
      }
    `,
          variables: {
            "owner": repo.owner,
            "name": repo.repository
          }
        })
      }).then(res => res.json()))
    })

    Promise.all(promiseArray).then((rsp) => {
      rsp.forEach((repo, idx) => {
        if (repo.data.repository.ref !== null) {
          repoList[idx].commits = repo.data.repository.ref.target.history.totalCount;
        }
        if (rsp.length === idx + 1) {
          this.updateRepos(repoList);
        }
      })
    })
  }

  updateRepos = (list) => {
    this.setState({ repoData: list });
  }

  onSuggestionSelected = (e, { suggestion }) => {
    this.setState({ selectedOrg: suggestion, repoData: [], emptyTableMsg: "Loading..." })
    this.getrepoData(suggestion.repos_url);
    this.getOrgData(suggestion.login)
  }
  getSuggestionValue = (suggestion) => {
    return suggestion.login;
  }
  renderSuggestion = (suggestion) => {
    return (
      <span>{suggestion.login}</span>
    );
  }


  componentDidMount() {
    Modal.setAppElement(this.el);
    window.addEventListener('scroll', this.handleScroll, true);
    this.setState({ emptyTableMsg: "Search for Github organizations above." })

  }

  handleScroll = () => {
    const pageY = window.scrollY;
    const thresh = (document.body.offsetWidth > 567)  ? 107 : 115;
    if (pageY >= thresh) {
      this.setState({ stickHeader: true })
    } else {
      this.setState({ stickHeader: false })
    }
  }

  render() {
    const { value, suggestions, isLoading } = this.state;
    const inputProps = {
      placeholder: "Search organization",
      value,
      onChange: this.onChange
    };
    return (
      <div className="App" >
        <header className="App-header">
          <div className="container">
            <img src={logo} alt="logo" className="logo"></img>
            <div className="input-group">
              <span><img src={search} /></span>
              <Autosuggest
                suggestions={suggestions}
                onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
                onSuggestionSelected={this.onSuggestionSelected}
                onSuggestionsClearRequested={this.onSuggestionsClearRequested}
                getSuggestionValue={this.getSuggestionValue}
                renderSuggestion={this.renderSuggestion}
                inputProps={inputProps} />
            </div>
          </div>
        </header>
        <div className="background-ribbon"></div>
        <div className="org-container">
          <div className="org-header-container">
            {this.state.repoData.length != 0 &&
              <div className="org-header" >
                <img src={this.state.orgData.avatar_url} />
                <div className="org-header_inner">
                  <div className="org-header_inner-top">
                    <h1>{this.state.orgData.name}</h1>
                    <h4>{this.state.orgData.repoCount} total repositories</h4>
                  </div>
                  <p>{this.state.orgData.description}</p>
                </div>
              </div>
            }
          </div>
          <div className="repo-table-container">

            <div className="repo-table">
              <DataTable
                title="test"
                columns={columns}
                data={this.state.repoData}
                className={[(this.state.stickHeader) ? 'sticky-header' : '', (this.state.hideStickyHeader) ? 'hide-sticky-header' : ''].join(' ')}
                striped={true}
                onCommitClick={() => { this.setState({ isPaneOpen: true }) }}
                expandableRows
                noDataComponent={this.state.emptyTableMsg}
                responsive={false}
                expandableRowsComponent={<ExpandedSection />}
              />
            </div>

          </div>

        </div>

      </div>
    );
  }
}

export default App;
